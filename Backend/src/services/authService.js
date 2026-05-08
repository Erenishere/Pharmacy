const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const User = require('../models/User');
const authSessionStore = require('./authSessionStore');
const { normalizeRole } = require('../utils/roleUtils');

class AuthService {
  /**
   * Generate JWT access token
   * @param {Object} payload - Token payload (userId, role)
   * @returns {String} JWT token
   */
  generateAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  }

  /**
   * Generate JWT refresh token
   * @param {Object} payload - Token payload (userId)
   * @returns {String} JWT refresh token
   */
  generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    });
  }

  /**
   * Verify JWT access token
   * @param {String} token - JWT token to verify
   * @returns {Object} Decoded token payload
   * @throws {Error} If token is invalid or expired
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Verify JWT refresh token
   * @param {String} token - JWT refresh token to verify
   * @returns {Object} Decoded token payload
   * @throws {Error} If token is invalid or expired
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Hash password using bcrypt
   * @param {String} password - Plain text password
   * @returns {String} Hashed password
   */
  async hashPassword(password) {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hashed password
   * @param {String} password - Plain text password
   * @param {String} hashedPassword - Hashed password
   * @returns {Boolean} True if passwords match
   */
  async comparePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Authenticate user with username/email and password
   * @param {String} identifier - Username or email
   * @param {String} password - Plain text password
   * @returns {Object} User object and tokens
   * @throws {Error} If authentication fails
   */
  async authenticate(identifier, password, metadata = {}) {
    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await user.updateLastLogin();

    // If user is a sales user, populate salesman data including warehouseId
    const userJSON = user.toJSON();
    const normalizedRole = normalizeRole(user.role);
    userJSON.role = normalizedRole;

    if (['sales', 'salesman'].includes(normalizedRole)) {
      const Salesman = require('../models/Salesman');
      const salesman = await Salesman.findOne({ userId: user._id });

      if (salesman) {
        userJSON.salesmanId = salesman._id;
        userJSON.salesmanCode = salesman.code;
        userJSON.warehouseId = salesman.warehouseId;
      }
    }

    // Generate tokens
    const sessionId = randomUUID();

    const accessToken = this.generateAccessToken({
      userId: user._id,
      role: normalizedRole,
      sid: sessionId,
    });

    const refreshToken = this.generateRefreshToken({
      userId: user._id,
      sid: sessionId,
      tid: randomUUID(),
    });

    await authSessionStore.createSession({
      sessionId,
      userId: user._id,
      refreshToken,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
    });

    return {
      user: userJSON,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   * @param {String} refreshToken - JWT refresh token
   * @returns {Object} New access token and user info
   * @throws {Error} If refresh token is invalid
   */
  async refreshAccessToken(refreshToken, metadata = {}) {
    // Verify refresh token
    const decoded = this.verifyRefreshToken(refreshToken);
    const session = await authSessionStore.validateRefreshToken(refreshToken);
    if (!decoded.sid || !session) {
      throw new Error('Invalid refresh token');
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken({
      userId: user._id,
      role: normalizeRole(user.role),
      sid: decoded.sid,
    });

    const rotatedRefreshToken = this.generateRefreshToken({
      userId: user._id,
      sid: decoded.sid,
      tid: randomUUID(),
    });

    await authSessionStore.rotateSession({
      sessionId: decoded.sid,
      userId: user._id,
      refreshToken: rotatedRefreshToken,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
    });

    return {
      user: {
        ...user.toJSON(),
        role: normalizeRole(user.role),
      },
      accessToken,
      refreshToken: rotatedRefreshToken,
    };
  }

  /**
   * Validate token and get user
   * @param {String} token - JWT access token
   * @returns {Object} User object
   * @throws {Error} If token is invalid or user not found
   */
  async validateTokenAndGetUser(token) {
    const decoded = this.verifyAccessToken(token);

    if (decoded.sid && await authSessionStore.isSessionRevoked(decoded.sid)) {
      throw new Error('Session has expired');
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    user.role = normalizeRole(user.role);

    // If user is a sales user, populate salesman data including warehouseId
    if (['sales', 'salesman'].includes(user.role)) {
      const Salesman = require('../models/Salesman');
      const salesman = await Salesman.findOne({ userId: user._id });

      if (salesman) {
        // Attach salesman data to user object
        user.salesmanId = salesman._id;
        user.salesmanCode = salesman.code;
        user.warehouseId = salesman.warehouseId;
      }
    }

    return user;
  }

  async logoutSession(accessToken, refreshToken = null, metadata = {}) {
    let sessionId = null;

    if (accessToken) {
      const decodedAccessToken = this.verifyAccessToken(accessToken);
      sessionId = decodedAccessToken.sid || null;
    }

    if (!sessionId && refreshToken) {
      const decodedRefreshToken = this.verifyRefreshToken(refreshToken);
      sessionId = decodedRefreshToken.sid || null;
    }

    if (!sessionId) {
      return false;
    }

    return authSessionStore.revokeSession(sessionId, metadata.reason || 'logout');
  }
}

module.exports = new AuthService();
