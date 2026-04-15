/**
 * Cache Middleware — Redis-backed
 *
 * All CacheManager calls are now awaited (async Redis).
 * Public API is unchanged so route files need no edits.
 */

const { CacheManager } = require('../utils/cache');

/**
 * Create cache middleware
 * @param {object} options
 * @param {string} options.duration - 'short' | 'medium' | 'long'
 * @param {number} options.ttl - custom TTL in seconds (overrides duration)
 * @param {Function} options.keyGenerator - (req) => string
 * @param {Function} options.condition - (req, res, data) => boolean
 */
function cacheMiddleware(options = {}) {
  const {
    duration = 'medium',
    ttl = null,
    keyGenerator = null,
    condition = null,
  } = options;

  return async (req, res, next) => {
    if (req.method !== 'GET') return next();

    const cacheKey = keyGenerator ? keyGenerator(req) : generateDefaultKey(req);

    try {
      const cached = await CacheManager.get(cacheKey, duration);
      if (cached !== undefined) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
    } catch (err) {
      // Cache read failure — proceed without cache
      console.error('[CacheMiddleware] read error:', err.message);
    }

    const originalJson = res.json.bind(res);

    res.json = function (data) {
      if (condition && !condition(req, res, data)) {
        res.set('X-Cache', 'SKIP');
        return originalJson(data);
      }

      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Fire-and-forget write — don't block the response
        CacheManager.set(cacheKey, data, duration, ttl).catch((err) =>
          console.error('[CacheMiddleware] write error:', err.message)
        );
        res.set('X-Cache', 'MISS');
      }

      return originalJson(data);
    };

    next();
  };
}

function generateDefaultKey(req) {
  const { path, query, user } = req;
  const userId = user ? user._id.toString() : 'anonymous';
  const queryString = Object.keys(query)
    .sort()
    .map((k) => `${k}=${query[k]}`)
    .join('&');
  return `route:${path}:${userId}:${queryString}`;
}

/**
 * Pre-built route cache configs
 */
const routeCache = {
  items: cacheMiddleware({
    duration: 'short',
    keyGenerator: (req) => {
      const { category, isActive, page, limit } = req.query;
      return CacheManager.generateKey('items:list', { category, isActive, page, limit });
    },
  }),

  item: cacheMiddleware({
    duration: 'medium',
    keyGenerator: (req) => `item:${req.params.id}`,
  }),

  taxConfig: cacheMiddleware({
    duration: 'long',
    keyGenerator: (req) => {
      const { type, isActive } = req.query;
      return CacheManager.generateKey('taxconfig:list', { type, isActive });
    },
  }),

  customers: cacheMiddleware({
    duration: 'medium',
    keyGenerator: (req) => {
      const { type, isActive, page, limit } = req.query;
      return CacheManager.generateKey('customers:list', { type, isActive, page, limit });
    },
  }),

  suppliers: cacheMiddleware({
    duration: 'medium',
    keyGenerator: (req) => {
      const { type, isActive, page, limit } = req.query;
      return CacheManager.generateKey('suppliers:list', { type, isActive, page, limit });
    },
  }),

  reports: cacheMiddleware({
    duration: 'short',
    keyGenerator: (req) => {
      const { reportType, startDate, endDate, ...rest } = req.query;
      return CacheManager.generateKey(`report:${reportType}`, { startDate, endDate, ...rest });
    },
  }),

  dashboard: cacheMiddleware({
    duration: 'short',
    keyGenerator: (req) => {
      const userId = req.user ? req.user._id.toString() : 'anonymous';
      return `dashboard:stats:${userId}`;
    },
  }),
};

/**
 * Middleware to clear cache patterns on successful mutations (POST/PUT/DELETE)
 * @param {Array<string|Function>} patterns - key strings or (req, data) => void functions
 */
function clearCacheMiddleware(patterns) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        patterns.forEach((pattern) => {
          if (typeof pattern === 'function') {
            pattern(req, data);
          } else {
            // Async fire-and-forget
            CacheManager.delPattern(`${pattern}*`).catch((err) =>
              console.error('[ClearCache] error:', err.message)
            );
          }
        });
      }
      return originalJson(data);
    };

    next();
  };
}

module.exports = { cacheMiddleware, routeCache, clearCacheMiddleware };
