/**
 * Cache Utility — Redis-backed (ioredis)
 *
 * Keeps the same CacheManager API as before so all existing code works
 * without modification. All methods are now async/Promise-based.
 *
 * TTL tiers:
 *   short  → 300 s  (5 min)   — volatile data (dashboard, reports)
 *   medium → 1800 s (30 min)  — semi-static (customers, suppliers, items)
 *   long   → 7200 s (2 hr)    — stable data (tax config, lookup tables)
 */

const NodeCache = require('node-cache');
const { getClient, isReady } = require('../config/redis');

const TTL = {
  short: 300,
  medium: 1800,
  long: 7200,
};

// L1 in-process cache — ultra-fast fallback / hot-data layer
const l1 = {
  short: new NodeCache({ stdTTL: 60, useClones: false }),   // 1 min in-process
  medium: new NodeCache({ stdTTL: 300, useClones: false }), // 5 min in-process
  long: new NodeCache({ stdTTL: 900, useClones: false }),   // 15 min in-process
};

const REDIS_PREFIX = 'erpv1:';

function redisKey(key) {
  return `${REDIS_PREFIX}${key}`;
}

function validateDuration(duration) {
  if (!TTL[duration]) throw new Error(`Invalid cache duration: ${duration}`);
}

class CacheManager {
  /**
   * Get value — checks L1 first, then Redis
   * @returns {Promise<any>} cached value or undefined
   */
  static async get(key, duration = 'medium') {
    validateDuration(duration);

    // L1 hit
    const l1val = l1[duration].get(key);
    if (l1val !== undefined) return l1val;

    // Redis hit
    if (!isReady()) return undefined;
    try {
      const raw = await getClient().get(redisKey(key));
      if (raw === null) return undefined;
      const val = JSON.parse(raw);
      // Warm L1
      l1[duration].set(key, val);
      return val;
    } catch (err) {
      console.error('[Cache] get error:', err.message);
      return undefined;
    }
  }

  /**
   * Set value in both L1 and Redis
   * @returns {Promise<void>}
   */
  static async set(key, value, duration = 'medium', ttl = null) {
    validateDuration(duration);
    const effectiveTTL = ttl || TTL[duration];

    // L1 write
    l1[duration].set(key, value);

    // Redis write
    if (!isReady()) return;
    try {
      await getClient().set(redisKey(key), JSON.stringify(value), 'EX', effectiveTTL);
    } catch (err) {
      console.error('[Cache] set error:', err.message);
    }
  }

  /**
   * Delete a key from both L1 and Redis
   * @returns {Promise<void>}
   */
  static async del(key, duration = 'medium') {
    validateDuration(duration);
    l1[duration].del(key);

    if (!isReady()) return;
    try {
      await getClient().del(redisKey(key));
    } catch (err) {
      console.error('[Cache] del error:', err.message);
    }
  }

  /**
   * Delete multiple keys
   * @returns {Promise<void>}
   */
  static async delMultiple(keys, duration = 'medium') {
    validateDuration(duration);
    keys.forEach((k) => l1[duration].del(k));

    if (!isReady()) return;
    try {
      const pipeline = getClient().pipeline();
      keys.forEach((k) => pipeline.del(redisKey(k)));
      await pipeline.exec();
    } catch (err) {
      console.error('[Cache] delMultiple error:', err.message);
    }
  }

  /**
   * Delete all keys matching a glob pattern in Redis
   * @param {string} pattern e.g. 'items:*'
   * @returns {Promise<void>}
   */
  static async delPattern(pattern) {
    // Flush matching L1 keys across all tiers
    Object.values(l1).forEach((cache) => {
      cache.keys().forEach((k) => {
        if (_matchesPattern(k, pattern)) cache.del(k);
      });
    });

    if (!isReady()) return;
    try {
      const fullPattern = redisKey(pattern);
      // Use SCAN for production-safe key iteration (never KEYS in prod)
      let cursor = '0';
      const toDelete = [];
      do {
        const [nextCursor, keys] = await getClient().scan(cursor, 'MATCH', fullPattern, 'COUNT', 100);
        cursor = nextCursor;
        toDelete.push(...keys);
      } while (cursor !== '0');

      if (toDelete.length > 0) {
        const pipeline = getClient().pipeline();
        toDelete.forEach((k) => pipeline.del(k));
        await pipeline.exec();
      }
    } catch (err) {
      console.error('[Cache] delPattern error:', err.message);
    }
  }

  /**
   * Clear all keys in a tier
   * @returns {Promise<void>}
   */
  static async clear(duration = 'medium') {
    validateDuration(duration);
    l1[duration].flushAll();
    await CacheManager.delPattern('*');
  }

  /**
   * Flush everything
   * @returns {Promise<void>}
   */
  static async clearAll() {
    Object.values(l1).forEach((c) => c.flushAll());
    if (!isReady()) return;
    try {
      // Only flush our own prefix
      await CacheManager.delPattern('*');
    } catch (err) {
      console.error('[Cache] clearAll error:', err.message);
    }
  }

  /**
   * Generate a deterministic cache key from params object
   */
  static generateKey(prefix, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .filter((k) => params[k] !== undefined && params[k] !== null)
      .map((k) => `${k}:${params[k]}`)
      .join('|');
    return sortedParams ? `${prefix}:${sortedParams}` : prefix;
  }

  /**
   * Wrap an async function with caching
   */
  static wrap(fn, keyPrefix, duration = 'medium') {
    return async function (...args) {
      const key = CacheManager.generateKey(keyPrefix, { args: JSON.stringify(args) });
      const cached = await CacheManager.get(key, duration);
      if (cached !== undefined) return cached;
      const result = await fn.apply(this, args);
      await CacheManager.set(key, result, duration);
      return result;
    };
  }

  /**
   * Redis health stats
   */
  static async getStats(duration = 'medium') {
    validateDuration(duration);
    return {
      l1: l1[duration].getStats(),
      redis: isReady() ? 'connected' : 'unavailable',
    };
  }

  static async getAllStats() {
    return {
      short: await CacheManager.getStats('short'),
      medium: await CacheManager.getStats('medium'),
      long: await CacheManager.getStats('long'),
    };
  }
}

/**
 * Simple glob pattern match (supports * wildcard only)
 */
function _matchesPattern(str, pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(str);
}

/**
 * Cache invalidation helpers — now async
 */
class CacheInvalidation {
  static async invalidateInvoice(invoiceId) {
    await Promise.all([
      CacheManager.del(`invoice:${invoiceId}`, 'medium'),
      CacheManager.delPattern('invoices:list:*'),
      CacheManager.delPattern('dashboard:*'),
      CacheManager.delPattern('report:sales:*'),
      CacheManager.delPattern('report:purchase:*'),
    ]);
  }

  static async invalidateItem(itemId) {
    await Promise.all([
      CacheManager.del(`item:${itemId}`, 'medium'),
      CacheManager.delPattern('items:list:*'),
      CacheManager.delPattern('items:lowstock:*'),
    ]);
  }

  static async invalidateCustomer(customerId) {
    await Promise.all([
      CacheManager.del(`customer:${customerId}`, 'medium'),
      CacheManager.delPattern('customers:list:*'),
      CacheManager.delPattern('dashboard:*'),
    ]);
  }

  static async invalidateSupplier(supplierId) {
    await Promise.all([
      CacheManager.del(`supplier:${supplierId}`, 'medium'),
      CacheManager.delPattern('suppliers:list:*'),
    ]);
  }

  static async invalidateTaxConfig() {
    await CacheManager.delPattern('taxconfig:*');
  }

  static async invalidateLedger(accountId) {
    await Promise.all([
      CacheManager.del(`ledger:${accountId}`, 'short'),
      CacheManager.del(`ledger:balance:${accountId}`, 'short'),
      CacheManager.delPattern('ledger:list:*'),
    ]);
  }
}

module.exports = {
  CacheManager,
  CacheInvalidation,
  // caches export kept for backward-compat (tests may import it)
  caches: l1,
};
