const NodeCache = require('node-cache');

/**
 * Cache Utilities for Redis and In-Memory Caching
 * Provides unified interface for caching with fallback to in-memory cache
 */
class CacheUtils {
  constructor() {
    // In-memory cache as fallback
    this.memoryCache = new NodeCache({
      stdTTL: 300, // 5 minutes default TTL
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false, // Don't clone objects for better performance
    });

    // Redis client will be initialized if available
    this.redisClient = null;
    this.isRedisAvailable = false;

    this.initRedis();
  }

  /**
   * Initialize Redis client if Redis is available
   */
  async initRedis() {
    try {
      const Redis = require('ioredis');

      // Try to connect to Redis (adjust connection string as needed)
      this.redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 5000,
      });

      // Test connection
      await this.redisClient.ping();
      this.isRedisAvailable = true;
      console.log('✅ Redis connected successfully');

      // Handle Redis connection errors gracefully
      this.redisClient.on('error', (err) => {
        console.warn('⚠️ Redis connection error:', err.message);
        this.isRedisAvailable = false;
      });

      this.redisClient.on('connect', () => {
        this.isRedisAvailable = true;
      });

      this.redisClient.on('disconnect', () => {
        this.isRedisAvailable = false;
      });

    } catch (error) {
      console.warn('⚠️ Redis not available, falling back to in-memory cache:', error.message);
      this.isRedisAvailable = false;
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or undefined if not found
   */
  async get(key) {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        const value = await this.redisClient.get(key);
        return value ? JSON.parse(value) : undefined;
      } else {
        return this.memoryCache.get(key);
      }
    } catch (error) {
      console.warn(`Cache get error for key ${key}:`, error.message);
      // Fallback to memory cache if Redis fails
      return this.memoryCache.get(key);
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional, uses default if not provided)
   */
  async set(key, value, ttl = null) {
    try {
      const serializedValue = JSON.stringify(value);

      if (this.isRedisAvailable && this.redisClient) {
        if (ttl) {
          await this.redisClient.setex(key, ttl, serializedValue);
        } else {
          await this.redisClient.set(key, serializedValue);
        }
      } else {
        this.memoryCache.set(key, value, ttl);
      }
    } catch (error) {
      console.warn(`Cache set error for key ${key}:`, error.message);
      // Fallback to memory cache if Redis fails
      this.memoryCache.set(key, value, ttl);
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if deleted, false if not found
   */
  async del(key) {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        const result = await this.redisClient.del(key);
        return result > 0;
      } else {
        return this.memoryCache.del(key);
      }
    } catch (error) {
      console.warn(`Cache delete error for key ${key}:`, error.message);
      // Fallback to memory cache if Redis fails
      return this.memoryCache.del(key);
    }
  }

  /**
   * Delete multiple keys matching pattern
   * @param {string} pattern - Pattern to match (glob style for Redis, prefix for memory)
   */
  async delPattern(pattern) {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } else {
        // For memory cache, we need to get all keys and filter
        const keys = this.memoryCache.keys();
        const matchingKeys = keys.filter(key => key.startsWith(pattern));
        matchingKeys.forEach(key => this.memoryCache.del(key));
      }
    } catch (error) {
      console.warn(`Cache delete pattern error for pattern ${pattern}:`, error.message);
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.flushdb();
      } else {
        this.memoryCache.flushAll();
      }
    } catch (error) {
      console.warn('Cache clear error:', error.message);
      // Fallback
      this.memoryCache.flushAll();
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  async getStats() {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        const info = await this.redisClient.info('memory');
        return {
          type: 'redis',
          available: true,
          info: info,
        };
      } else {
        const stats = this.memoryCache.getStats();
        return {
          type: 'memory',
          available: true,
          keys: stats.keys,
          hits: stats.hits,
          misses: stats.misses,
          ksize: stats.ksize,
          vsize: stats.vsize,
        };
      }
    } catch (error) {
      console.warn('Cache stats error:', error.message);
      return {
        type: 'unknown',
        available: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if cache is available
   * @returns {boolean} True if cache is available
   */
  isAvailable() {
    return this.isRedisAvailable || true; // Memory cache is always available
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.isRedisAvailable = false;
    }
  }
}

// Create singleton instance
const cacheUtils = new CacheUtils();

// Export convenience functions
const getCache = (key) => cacheUtils.get(key);
const setCache = (key, value, ttl) => cacheUtils.set(key, value, ttl);
const deleteCache = (key) => cacheUtils.del(key);
const clearCache = () => cacheUtils.clear();
const getCacheStats = () => cacheUtils.getStats();

module.exports = {
  CacheUtils,
  cacheUtils,
  getCache,
  setCache,
  deleteCache,
  clearCache,
  getCacheStats,
};
