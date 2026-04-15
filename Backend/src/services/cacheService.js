/**
 * Cache Service
 * Provides in-memory caching for frequently accessed data
 * Implements cache-aside pattern with automatic invalidation
 */

const NodeCache = require('node-cache');

class CacheService {
  constructor() {
    // Initialize in-memory cache
    this.cache = new NodeCache({
      stdTTL: this.DEFAULT_TTL,
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false, // Don't clone objects for better performance
    });

    // Default TTL in seconds
    this.DEFAULT_TTL = 300; // 5 minutes
    this.LONG_TTL = 3600; // 1 hour
    this.SHORT_TTL = 60; // 1 minute

    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };

    console.log('[Cache] In-memory cache initialized');
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    try {
      const value = this.cache.get(key);
      
      if (value !== undefined) {
        this.stats.hits++;
        return value;
      }
      
      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('[Cache] Get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttl = this.DEFAULT_TTL) {
    try {
      const success = this.cache.set(key, value, ttl);
      if (success) this.stats.sets++;
      return success;
    } catch (error) {
      console.error('[Cache] Set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async delete(key) {
    try {
      const deleted = this.cache.del(key);
      if (deleted > 0) this.stats.deletes++;
      return deleted > 0;
    } catch (error) {
      console.error('[Cache] Delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   * @param {string} pattern - Key pattern (e.g., 'user:*')
   * @returns {Promise<number>} Number of keys deleted
   */
  async deletePattern(pattern) {
    try {
      const keys = this.cache.keys();
      const matchingKeys = keys.filter(key => key.includes(pattern.replace('*', '')));
      if (matchingKeys.length > 0) {
        const deleted = this.cache.del(matchingKeys);
        this.stats.deletes += deleted;
        return deleted;
      }
      return 0;
    } catch (error) {
      console.error('[Cache] Delete pattern error:', error);
      return 0;
    }
  }

  /**
   * Get or set cache value (cache-aside pattern)
   * @param {string} key - Cache key
   * @param {Function} factory - Factory function to create value if not cached
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>}
   */
  async getOrSet(key, factory, ttl = this.DEFAULT_TTL) {
    // Try to get from cache
    let value = await this.get(key);
    
    if (value !== null) {
      return value;
    }

    // Cache miss - generate value
    value = await factory();
    
    // Store in cache
    if (value !== null && value !== undefined) {
      await this.set(key, value, ttl);
    }

    return value;
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    try {
      return this.cache.has(key);
    } catch (error) {
      console.error('[Cache] Exists error:', error);
      return false;
    }
  }

  /**
   * Get multiple values
   * @param {Array<string>} keys - Cache keys
   * @returns {Promise<Array<any>>}
   */
  async mget(keys) {
    try {
      const values = this.cache.mget(keys);
      return keys.map(key => values[key] !== undefined ? values[key] : null);
    } catch (error) {
      console.error('[Cache] Mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values
   * @param {Array<{key: string, value: any}>} items - Items to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>}
   */
  async mset(items, ttl = this.DEFAULT_TTL) {
    try {
      const msetItems = items.map(item => ({ key: item.key, val: item.value, ttl }));
      const success = this.cache.mset(msetItems);
      if (success) this.stats.sets += items.length;
      return success;
    } catch (error) {
      console.error('[Cache] Mset error:', error);
      return false;
    }
  }

  /**
   * Increment counter
   * @param {string} key - Cache key
   * @param {number} amount - Amount to increment
   * @returns {Promise<number>} New value
   */
  async increment(key, amount = 1) {
    try {
      const current = this.cache.get(key) || 0;
      const newValue = current + amount;
      this.cache.set(key, newValue);
      return newValue;
    } catch (error) {
      console.error('[Cache] Increment error:', error);
      return 0;
    }
  }

  /**
   * Decrement counter
   * @param {string} key - Cache key
   * @param {number} amount - Amount to decrement
   * @returns {Promise<number>} New value
   */
  async decrement(key, amount = 1) {
    try {
      const current = this.cache.get(key) || 0;
      const newValue = current - amount;
      this.cache.set(key, newValue);
      return newValue;
    } catch (error) {
      console.error('[Cache] Decrement error:', error);
      return 0;
    }
  }

  /**
   * Set expiration on key
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>}
   */
  async expire(key, ttl) {
    try {
      return this.cache.ttl(key, ttl);
    } catch (error) {
      console.error('[Cache] Expire error:', error);
      return false;
    }
  }

  /**
   * Get TTL of key
   * @param {string} key - Cache key
   * @returns {Promise<number>} TTL in seconds, -1 if no expiry, -2 if not found
   */
  async ttl(key) {
    try {
      const ttl = this.cache.getTtl(key);
      if (ttl === undefined) return -2; // not found
      if (ttl === 0) return -1; // no expiry
      return ttl;
    } catch (error) {
      console.error('[Cache] TTL error:', error);
      return -2;
    }
  }

  /**
   * Cache warming for master data
   * Pre-populates cache with frequently accessed data
   */
  async warmMasterDataCache() {
    console.log('[Cache] Warming master data cache...');
    
    try {
      // Cache items
      const Item = require('../models/Item');
      const items = await Item.find({ isActive: true })
        .select('_id code name companyId categoryId pricing currentStock')
        .limit(1000)
        .lean();

      const itemPromises = items.map(item => {
        const key = `item:${item._id}`;
        return this.set(key, item, this.LONG_TTL);
      });

      // Cache by code lookup
      const codePromises = items.map(item => {
        const key = `item:code:${item.code}`;
        return this.set(key, item._id, this.LONG_TTL);
      });

      await Promise.all([...itemPromises, ...codePromises]);
      console.log(`[Cache] Cached ${items.length} items`);

      // Cache customers
      const Customer = require('../models/Customer');
      const customers = await Customer.find({ isActive: true })
        .select('_id code name currentBalance creditAmountLimit assignedUserId')
        .limit(1000)
        .lean();

      const customerPromises = customers.map(customer => {
        const key = `customer:${customer._id}`;
        return this.set(key, customer, this.LONG_TTL);
      });

      const customerCodePromises = customers.map(customer => {
        const key = `customer:code:${customer.code}`;
        return this.set(key, customer._id, this.LONG_TTL);
      });

      await Promise.all([...customerPromises, ...customerCodePromises]);
      console.log(`[Cache] Cached ${customers.length} customers`);

      console.log('[Cache] Master data cache warming complete');
      return true;
    } catch (error) {
      console.error('[Cache] Error warming master data:', error);
      return false;
    }
  }

  /**
   * Cache query results
   * @param {string} queryHash - Hash of query parameters
   * @param {Function} queryFn - Query function
   * @param {number} ttl - Time to live
   * @returns {Promise<any>}
   */
  async cacheQuery(queryHash, queryFn, ttl = this.SHORT_TTL) {
    const key = `query:${queryHash}`;
    return this.getOrSet(key, queryFn, ttl);
  }

  /**
   * Invalidate cache by tags
   * @param {Array<string>} tags - Cache tags to invalidate
   * @returns {Promise<number>} Number of keys deleted
   */
  async invalidateByTags(tags) {
    let deleted = 0;
    
    for (const tag of tags) {
      const keys = this.cache.keys();
      const matchingKeys = keys.filter(key => key.includes(`:${tag}:`));
      if (matchingKeys.length > 0) {
        deleted += this.cache.del(matchingKeys);
      }
    }
    
    return deleted;
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      total,
      hitRate: `${hitRate}%`,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
  }

  /**
   * Clear all cache
   * @returns {Promise<boolean>}
   */
  async clear() {
    try {
      this.cache.flushAll();
      console.log('[Cache] Cache cleared');
      return true;
    } catch (error) {
      console.error('[Cache] Clear error:', error);
      return false;
    }
  }

  /**
   * Get cache health status
   * @returns {Promise<Object>}
   */
  async health() {
    try {
      return {
        status: 'healthy',
        connected: true,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Disconnect from cache (no-op for in-memory cache)
   */
  async disconnect() {
    // No-op for in-memory cache
  }
}

// Export singleton instance
module.exports = new CacheService();
