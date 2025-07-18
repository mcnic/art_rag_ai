const { DocumentSearcher } = require('./search_documents');
const { LLMIntegration } = require('./llm_integration');
const { CacheManager } = require('./cache_manager');
const { MetricsLogger } = require('./metrics_logger');
require('dotenv').config();

class RAGPipeline {
  constructor(options = {}) {
    this.searcher = new DocumentSearcher();
    const defaultModel = process.env.OLLAMA_MODEL || 'gemma2:2b';
    this.llm = new LLMIntegration(options.modelName || defaultModel);

    // Configuration
    this.topK = options.topK || 5;
    this.scoreThreshold = options.scoreThreshold || 0.7;
    this.maxContextLength = options.maxContextLength || 4000; // Limit context length

    // Logging
    this.enableLogging = options.enableLogging !== false;

    // Caching
    this.cache = new CacheManager({
      useRedis: options.useRedis !== false,
      ttl: options.cacheTtl || 3600, // 1 hour
      prefix: options.cachePrefix || 'art_rag:',
    });

    // Metrics
    this.metrics = new MetricsLogger({
      enabled: options.enableMetrics !== false,
      logDir: options.logDir || './logs',
    });
  }

  /**
   * Log message if logging is enabled
   * @param {string} message - Message to log
   * @param {string} level - Log level (info, warn, error)
   */
  log(message, level = 'info') {
    if (!this.enableLogging) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Truncate context if it's too long
   * @param {string} context - Context string
   * @returns {string} Truncated context
   */
  truncateContext(context) {
    if (context.length <= this.maxContextLength) {
      return context;
    }

    this.log(
      `Context too long (${context.length} chars), truncating to ${this.maxContextLength} chars`,
      'warn'
    );
    return context.substring(0, this.maxContextLength) + '... [truncated]';
  }

  /**
   * Main RAG pipeline: search + generate answer
   * @param {string} question - User's question
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Complete RAG response
   */
  async ask(question, options = {}) {
    const startTime = Date.now();
    const pipelineId = `pipeline_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    this.log(`Starting RAG pipeline ${pipelineId} for question: "${question}"`);

    try {
      // Check cache first
      const cacheStartTime = Date.now();
      const cachedResponse = await this.cache.get(question, options);
      const cacheTime = Date.now() - cacheStartTime;

      if (cachedResponse) {
        this.log(`Cache hit! Returning cached response in ${cacheTime}ms`);

        // Log cache hit
        await this.metrics.logRAGRequest(
          {
            question,
            ...options,
            cacheKey: this.cache.generateKey(question, options),
          },
          cachedResponse,
          {
            totalProcessingTime: cacheTime,
            searchTime: 0,
            generationTime: 0,
            cacheTime: cacheTime,
          },
          true
        );

        return {
          ...cachedResponse,
          metadata: {
            ...cachedResponse.metadata,
            fromCache: true,
            cacheTime: cacheTime,
          },
        };
      }

      this.log(`Cache miss, processing question...`);

      // Step 1: Search for relevant documents
      this.log('Step 1: Searching for relevant documents...');
      const searchStartTime = Date.now();

      const searchOptions = {
        topK: options.topK || this.topK,
        scoreThreshold: options.scoreThreshold || this.scoreThreshold,
        filters: options.filters || {},
      };

      let documents;
      if (Object.keys(searchOptions.filters).length > 0) {
        documents = await this.searcher.searchWithFilters(
          question,
          searchOptions.filters,
          searchOptions.topK
        );
      } else {
        documents = await this.searcher.searchDocuments(
          question,
          searchOptions.topK,
          searchOptions.scoreThreshold
        );
      }

      const searchTime = Date.now() - searchStartTime;
      this.log(
        `Found ${documents.length} relevant documents in ${searchTime}ms`
      );

      // Step 2: Format context from documents
      this.log('Step 2: Formatting context from documents...');
      const contextStartTime = Date.now();

      const context = this.llm.formatContext(documents);
      const truncatedContext = this.truncateContext(context);

      const contextTime = Date.now() - contextStartTime;
      this.log(
        `Context formatted in ${contextTime}ms (${truncatedContext.length} chars)`
      );

      // Step 3: Generate answer using LLM
      this.log('Step 3: Generating answer with LLM...');
      const generationStartTime = Date.now();

      const llmResponse = await this.llm.generateAnswer(
        truncatedContext,
        question
      );

      const generationTime = Date.now() - generationStartTime;
      this.log(`Answer generated in ${generationTime}ms`);

      // Step 4: Compile final response
      const totalTime = Date.now() - startTime;
      this.log(`RAG pipeline completed in ${totalTime}ms`);

      const response = {
        question,
        answer: llmResponse.answer,
        sources: documents.map((doc) => ({
          id: doc.id,
          title: doc.metadata.title,
          artist: doc.metadata.artist,
          accession_number: doc.metadata.accession_number,
          score: doc.score,
          chunkIndex: doc.metadata.chunkIndex,
        })),
        metadata: {
          pipelineId,
          totalProcessingTime: totalTime,
          searchTime,
          contextTime,
          generationTime,
          llmProcessingTime: llmResponse.processingTime,
          documentsFound: documents.length,
          contextLength: truncatedContext.length,
          model: llmResponse.model,
          timestamp: llmResponse.timestamp,
          searchOptions,
          fromCache: false,
        },
      };

      // Cache the response
      const cacheSetStartTime = Date.now();
      await this.cache.set(question, options, response);
      const cacheSetTime = Date.now() - cacheSetStartTime;
      this.log(`Response cached in ${cacheSetTime}ms`);

      // Log the request
      await this.metrics.logRAGRequest(
        {
          question,
          ...options,
          cacheKey: this.cache.generateKey(question, options),
        },
        response,
        {
          totalProcessingTime: totalTime,
          searchTime,
          generationTime,
          cacheTime: cacheTime + cacheSetTime,
        },
        false
      );

      return response;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.log(
        `RAG pipeline failed after ${totalTime}ms: ${error.message}`,
        'error'
      );

      // Log error
      await this.metrics.logError(
        'RAG_PIPELINE',
        error.message,
        {
          question,
          pipelineId,
          totalTime,
        },
        error
      );

      throw {
        error: error.message,
        pipelineId,
        totalProcessingTime: totalTime,
        question,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Test the complete RAG pipeline
   * @param {string} testQuestion - Test question
   * @returns {Promise<boolean>} Success status
   */
  async testPipeline(
    testQuestion = 'Tell me about Chinese artists in the collection'
  ) {
    try {
      this.log('Testing complete RAG pipeline...');

      // Test cache
      this.log('Testing cache...');
      const cacheTest = await this.cache.test();
      if (cacheTest) {
        this.log('Cache test passed');
      } else {
        this.log('Cache test failed', 'warn');
      }

      // Test search component
      this.log('Testing search component...');
      const searchTest = await this.searcher.searchDocuments(
        testQuestion,
        3,
        0.5
      );
      if (searchTest.length === 0) {
        this.log('Search test failed: no documents found', 'warn');
      } else {
        this.log(`Search test passed: found ${searchTest.length} documents`);
      }

      // Test LLM component
      this.log('Testing LLM component...');
      const llmTest = await this.llm.testConnection();
      if (!llmTest) {
        this.log('LLM test failed', 'error');
        return false;
      }
      this.log('LLM test passed');

      // Test full pipeline
      this.log('Testing full RAG pipeline...');
      const response = await this.ask(testQuestion, { topK: 3 });

      this.log('Full pipeline test results:');
      this.log(`- Answer length: ${response.answer.length} characters`);
      this.log(`- Sources found: ${response.sources.length}`);
      this.log(
        `- Total processing time: ${response.metadata.totalProcessingTime}ms`
      );

      return true;
    } catch (error) {
      this.log(`Pipeline test failed: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Get pipeline statistics and health status
   * @returns {Promise<Object>} Pipeline status
   */
  async getStatus() {
    try {
      const indexStats = await this.searcher.getIndexStats();
      const llmStatus = await this.llm.testConnection();
      const cacheStats = await this.cache.getStats();
      const metrics = this.metrics.getMetrics();

      return {
        status: 'healthy',
        components: {
          search: 'connected',
          llm: llmStatus ? 'connected' : 'disconnected',
          cache: cacheStats.useRedis ? 'redis' : 'memory',
        },
        index: {
          totalVectors: indexStats.totalVectorCount,
          dimension: indexStats.dimension,
        },
        cache: cacheStats,
        metrics: metrics,
        configuration: {
          topK: this.topK,
          scoreThreshold: this.scoreThreshold,
          maxContextLength: this.maxContextLength,
          model: this.llm.llm.model,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getCacheStats() {
    return await this.cache.getStats();
  }

  /**
   * Get metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return this.metrics.getMetrics();
  }

  /**
   * Get top questions
   * @param {number} limit - Number of top questions
   * @returns {Array} Top questions
   */
  getTopQuestions(limit = 10) {
    return this.metrics.getTopQuestions(limit);
  }

  /**
   * Clear cache
   * @returns {Promise<boolean>} Success status
   */
  async clearCache() {
    return await this.cache.clear();
  }

  /**
   * Export metrics
   * @param {string} filename - Export filename
   * @returns {Promise<Object>} Export data
   */
  async exportMetrics(filename = null) {
    return await this.metrics.exportMetrics(filename);
  }
}

// Example usage and testing
async function testRAGPipeline() {
  const pipeline = new RAGPipeline({
    topK: 5,
    scoreThreshold: 0.6,
    enableLogging: true,
  });

  try {
    // Test pipeline status
    console.log('=== Pipeline Status ===');
    const status = await pipeline.getStatus();
    console.log(JSON.stringify(status, null, 2));
    console.log();

    // Test complete pipeline
    console.log('=== Testing RAG Pipeline ===');
    const testQuestions = [
      'What Chinese artists are represented in the collection?',
      'Tell me about landscape paintings',
      'What oil paintings from the 19th century are available?',
    ];

    for (const question of testQuestions) {
      console.log(`\n--- Question: "${question}" ---`);
      const response = await pipeline.ask(question);

      console.log(`Answer: ${response.answer.substring(0, 300)}...`);
      console.log(`Sources: ${response.sources.length} documents`);
      console.log(
        `Processing time: ${response.metadata.totalProcessingTime}ms`
      );

      if (response.sources.length > 0) {
        console.log('Top source:');
        console.log(
          `  - ${response.sources[0].title} by ${response.sources[0].artist}`
        );
        console.log(`  - Score: ${response.sources[0].score.toFixed(3)}`);
      }
    }
  } catch (error) {
    console.error('RAG pipeline test failed:', error);
  }
}

module.exports = { RAGPipeline };

// Run test if this file is executed directly
if (require.main === module) {
  testRAGPipeline();
}
