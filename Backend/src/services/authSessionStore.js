const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const NodeCache = require('node-cache');
const { getClient, isReady } = require('../config/redis');

const SESSION_PREFIX = 'auth:session:';
const DEFAULT_ACCESS_TTL_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

class AuthSessionStore {
  constructor() {
    this.memoryStore = new NodeCache({
      stdTTL: 0,
      useClones: false,
      deleteOnExpire: true,
    });
  }

  getSessionKey(sessionId) {
    return `${SESSION_PREFIX}${sessionId}`;
  }

  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  decodeToken(token) {
    return jwt.decode(token) || null;
  }

  getExpiryDate(token, fallbackSeconds) {
    const decoded = this.decodeToken(token);
    if (!decoded?.exp) {
      return new Date(Date.now() + (fallbackSeconds * 1000)).toISOString();
    }

    return new Date(decoded.exp * 1000).toISOString();
  }

  getRemainingTtlSeconds(expiresAt, fallbackSeconds) {
    if (!expiresAt) {
      return fallbackSeconds;
    }

    return Math.max(Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000), 1);
  }

  async setJson(key, value, ttlSeconds) {
    if (isReady()) {
      try {
        await getClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      } catch (error) {
        console.error('[AuthSessionStore] Redis set failed:', error.message);
      }
    }

    this.memoryStore.set(key, value, ttlSeconds);
  }

  async getJson(key) {
    if (isReady()) {
      try {
        const value = await getClient().get(key);
        if (value !== null) {
          return JSON.parse(value);
        }
      } catch (error) {
        console.error('[AuthSessionStore] Redis get failed:', error.message);
      }
    }

    return this.memoryStore.get(key);
  }

  async createSession({ sessionId, userId, refreshToken, userAgent = null, ipAddress = null }) {
    const record = {
      sessionId,
      userId: userId.toString(),
      refreshTokenHash: this.hashToken(refreshToken),
      userAgent,
      ipAddress,
      createdAt: new Date().toISOString(),
      lastRotatedAt: new Date().toISOString(),
      refreshExpiresAt: this.getExpiryDate(refreshToken, DEFAULT_REFRESH_TTL_SECONDS),
      revokedAt: null,
      revokedReason: null,
    };

    await this.setJson(
      this.getSessionKey(sessionId),
      record,
      this.getRemainingTtlSeconds(record.refreshExpiresAt, DEFAULT_REFRESH_TTL_SECONDS),
    );

    return record;
  }

  async getSession(sessionId) {
    if (!sessionId) {
      return null;
    }

    return this.getJson(this.getSessionKey(sessionId));
  }

  async validateRefreshToken(refreshToken) {
    const decoded = this.decodeToken(refreshToken);
    const sessionId = decoded?.sid;
    if (!sessionId) {
      return null;
    }

    const session = await this.getSession(sessionId);
    if (!session || session.revokedAt) {
      return null;
    }

    if (session.refreshTokenHash !== this.hashToken(refreshToken)) {
      return null;
    }

    return session;
  }

  async rotateSession({ sessionId, userId, refreshToken, userAgent = null, ipAddress = null }) {
    const existing = await this.getSession(sessionId);
    if (!existing || existing.revokedAt) {
      return null;
    }

    const updated = {
      ...existing,
      userId: (userId || existing.userId).toString(),
      refreshTokenHash: this.hashToken(refreshToken),
      userAgent: userAgent || existing.userAgent,
      ipAddress: ipAddress || existing.ipAddress,
      lastRotatedAt: new Date().toISOString(),
      refreshExpiresAt: this.getExpiryDate(refreshToken, DEFAULT_REFRESH_TTL_SECONDS),
    };

    await this.setJson(
      this.getSessionKey(sessionId),
      updated,
      this.getRemainingTtlSeconds(updated.refreshExpiresAt, DEFAULT_REFRESH_TTL_SECONDS),
    );

    return updated;
  }

  async revokeSession(sessionId, reason = 'logout') {
    const existing = await this.getSession(sessionId);
    if (!existing) {
      return false;
    }

    const updated = {
      ...existing,
      revokedAt: new Date().toISOString(),
      revokedReason: reason,
    };

    await this.setJson(
      this.getSessionKey(sessionId),
      updated,
      this.getRemainingTtlSeconds(updated.refreshExpiresAt, DEFAULT_REFRESH_TTL_SECONDS),
    );

    return true;
  }

  async isSessionRevoked(sessionId) {
    const session = await this.getSession(sessionId);
    return !session || Boolean(session.revokedAt);
  }

  async clearAll() {
    const keys = this.memoryStore.keys();
    keys.forEach((key) => this.memoryStore.del(key));

    if (!isReady()) {
      return;
    }

    try {
      let cursor = '0';
      do {
        const [nextCursor, matchedKeys] = await getClient().scan(
          cursor,
          'MATCH',
          `${SESSION_PREFIX}*`,
          'COUNT',
          100,
        );
        cursor = nextCursor;

        if (matchedKeys.length > 0) {
          await getClient().del(...matchedKeys);
        }
      } while (cursor !== '0');
    } catch (error) {
      console.error('[AuthSessionStore] Redis clear failed:', error.message);
    }
  }

  getDefaultAccessTtlSeconds() {
    return DEFAULT_ACCESS_TTL_SECONDS;
  }
}

module.exports = new AuthSessionStore();
