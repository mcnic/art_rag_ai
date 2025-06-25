const Redis = require('ioredis');
const crypto = require('crypto');
require('dotenv').config();

class CacheManager {
  constructor(options = {}) {
    this.useRedis = options.useRedis !== false;
    this.ttl = options.ttl || 3600; // 1 hour default
    this.prefix = options.prefix || 'art_rag:';

    // In-memory cache fallback
    this.memoryCache = new Map();
    this.memoryCacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };

    // Initialize Redis if enabled
    if (this.useRedis) {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redis.on('error', (error) => {
        console.warn(
          'Redis connection error, falling back to memory cache:',
          error.message
        );
        this.useRedis = false;
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });
    }
  }

  /**
   * Generate cache key from question and options
   * @param {string} question - User question
   * @param {Object} options - Search options
   * @returns {string} Cache key
   */
  generateKey(question, options = {}) {
    const data = {
      question: question.toLowerCase().trim(),
      topK: options.topK || 5,
      scoreThreshold: options.scoreThreshold || 0.6,
      filters: options.filters || {},
      model: options.model || 'gemma2:2b',
    };

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
    return `${this.prefix}${hash}`;
  }

  /**
   * Get cached response
   * @param {string} question - User question
   * @param {Object} options - Search options
   * @returns {Promise<Object|null>} Cached response or null
   */
  async get(question, options = {}) {
    const key = this.generateKey(question, options);

    try {
      if (this.useRedis && this.redis.status === 'ready') {
        const cached = await this.redis.get(key);
        if (cached) {
          this.memoryCacheStats.hits++;
          return JSON.parse(cached);
        }
      } else {
        // Fallback to memory cache
        const cached = this.memoryCache.get(key);
        if (cached && cached.expiresAt > Date.now()) {
          this.memoryCacheStats.hits++;
          return cached.data;
        } else if (cached) {
          // Expired, remove it
          this.memoryCache.delete(key);
        }
      }

      this.memoryCacheStats.misses++;
      return null;
    } catch (error) {
      console.warn('Cache get error:', error.message);
      this.memoryCacheStats.misses++;
      return null;
    }
  }

  /**
   * Set cached response
   * @param {string} question - User question
   * @param {Object} options - Search options
   * @param {Object} response - Response to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(question, options = {}, response, ttl = null) {
    const key = this.generateKey(question, options);
    const cacheTtl = ttl || this.ttl;

    try {
      if (this.useRedis && this.redis.status === 'ready') {
        await this.redis.setex(key, cacheTtl, JSON.stringify(response));
        this.memoryCacheStats.sets++;
        return true;
      } else {
        // Fallback to memory cache
        this.memoryCache.set(key, {
          data: response,
          expiresAt: Date.now() + cacheTtl * 1000,
        });
        this.memoryCacheStats.sets++;
        return true;
      }
    } catch (error) {
      console.warn('Cache set error:', error.message);
      return false;
    }
  }

  /**
   * Delete cached response
   * @param {string} question - User question
   * @param {Object} options - Search options
   * @returns {Promise<boolean>} Success status
   */
  async delete(question, options = {}) {
    const key = this.generateKey(question, options);

    try {
      if (this.useRedis && this.redis.status === 'ready') {
        await this.redis.del(key);
      } else {
        this.memoryCache.delete(key);
      }
      this.memoryCacheStats.deletes++;
      return true;
    } catch (error) {
      console.warn('Cache delete error:', error.message);
      return false;
    }
  }

  /**
   * Clear all cached responses
   * @returns {Promise<boolean>} Success status
   */
  async clear() {
    try {
      if (this.useRedis && this.redis.status === 'ready') {
        const keys = await this.redis.keys(`${this.prefix}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        this.memoryCache.clear();
      }
      return true;
    } catch (error) {
      console.warn('Cache clear error:', error.message);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getStats() {
    let redisStats = {};

    if (this.useRedis && this.redis.status === 'ready') {
      try {
        const keys = await this.redis.keys(`${this.prefix}*`);
        redisStats = {
          totalKeys: keys.length,
          memoryUsage: await this.redis.memory('USAGE', keys[0] || ''),
        };
      } catch (error) {
        console.warn('Redis stats error:', error.message);
      }
    }

    return {
      useRedis: this.useRedis,
      redisStatus: this.useRedis ? this.redis.status : 'disabled',
      memoryCache: {
        size: this.memoryCache.size,
        hits: this.memoryCacheStats.hits,
        misses: this.memoryCacheStats.misses,
        sets: this.memoryCacheStats.sets,
        deletes: this.memoryCacheStats.deletes,
        hitRate:
          this.memoryCacheStats.hits /
            (this.memoryCacheStats.hits + this.memoryCacheStats.misses) || 0,
      },
      redis: redisStats,
      ttl: this.ttl,
      prefix: this.prefix,
    };
  }

  /**
   * Test cache functionality
   * @returns {Promise<boolean>} Test result
   */
  async test() {
    try {
      const testData = { test: 'data', timestamp: Date.now() };
      const testQuestion = 'test question';
      const testOptions = { topK: 3 };

      // Test set
      const setResult = await this.set(testQuestion, testOptions, testData, 60);
      if (!setResult) return false;

      // Test get
      const getResult = await this.get(testQuestion, testOptions);
      if (!getResult || getResult.test !== 'data') return false;

      // Test delete
      const deleteResult = await this.delete(testQuestion, testOptions);
      if (!deleteResult) return false;

      // Verify deletion
      const getAfterDelete = await this.get(testQuestion, testOptions);
      if (getAfterDelete !== null) return false;

      return true;
    } catch (error) {
      console.error('Cache test failed:', error);
      return false;
    }
  }
}

module.exports = { CacheManager };
