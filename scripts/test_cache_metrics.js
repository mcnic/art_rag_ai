const { CacheManager } = require('./cache_manager');
const { MetricsLogger } = require('./metrics_logger');
const { RAGPipeline } = require('./rag_pipeline');
require('dotenv').config();

async function testCache() {
  console.log('=== Testing Cache Manager ===\n');

  const cache = new CacheManager({
    useRedis: false, // Use memory cache for testing
    ttl: 60, // 1 minute
  });

  try {
    // Test 1: Basic cache operations
    console.log('1. Testing basic cache operations...');
    const testData = { answer: 'Test answer', sources: [] };
    const testQuestion = 'What is art?';
    const testOptions = { topK: 3 };

    // Set cache
    const setResult = await cache.set(testQuestion, testOptions, testData);
    console.log('✅ Cache set:', setResult);

    // Get cache
    const getResult = await cache.get(testQuestion, testOptions);
    console.log('✅ Cache get:', getResult ? 'Success' : 'Miss');

    // Test cache miss with different options
    const getResult2 = await cache.get(testQuestion, { topK: 5 });
    console.log(
      '✅ Cache miss (different options):',
      getResult2 ? 'Unexpected hit' : 'Correct miss'
    );

    // Test 2: Cache statistics
    console.log('\n2. Testing cache statistics...');
    const stats = await cache.getStats();
    console.log('✅ Cache stats:', JSON.stringify(stats, null, 2));

    // Test 3: Cache deletion
    console.log('\n3. Testing cache deletion...');
    const deleteResult = await cache.delete(testQuestion, testOptions);
    console.log('✅ Cache delete:', deleteResult);

    const getAfterDelete = await cache.get(testQuestion, testOptions);
    console.log(
      '✅ Cache get after delete:',
      getAfterDelete ? 'Unexpected hit' : 'Correct miss'
    );

    // Test 4: Cache test
    console.log('\n4. Testing cache functionality...');
    const testResult = await cache.test();
    console.log('✅ Cache test:', testResult ? 'Passed' : 'Failed');
  } catch (error) {
    console.error('❌ Cache test failed:', error.message);
  }
}

async function testMetrics() {
  console.log('\n=== Testing Metrics Logger ===\n');

  const metrics = new MetricsLogger({
    enabled: true,
    logDir: './logs',
  });

  try {
    // Test 1: RAG request logging
    console.log('1. Testing RAG request logging...');
    const requestData = {
      question: 'What is impressionism?',
      topK: 5,
      scoreThreshold: 0.6,
    };

    const responseData = {
      answer: 'Impressionism is an art movement...',
      sources: [
        { id: '1', title: 'Artwork 1', score: 0.85 },
        { id: '2', title: 'Artwork 2', score: 0.78 },
      ],
      metadata: {
        pipelineId: 'test_123',
        model: 'gemma2:2b',
        documentsFound: 2,
      },
    };

    const timingData = {
      totalProcessingTime: 2500,
      searchTime: 800,
      generationTime: 1700,
    };

    await metrics.logRAGRequest(requestData, responseData, timingData, false);
    console.log('✅ RAG request logged');

    // Test 2: Search request logging
    console.log('\n2. Testing search request logging...');
    const searchRequestData = {
      question: 'landscape paintings',
      filters: { medium: 'Oil on canvas' },
    };

    const searchResponseData = {
      documents: [
        { id: '3', score: 0.92 },
        { id: '4', score: 0.88 },
      ],
    };

    const searchTimingData = {
      totalTime: 1200,
    };

    await metrics.logSearchRequest(
      searchRequestData,
      searchResponseData,
      searchTimingData
    );
    console.log('✅ Search request logged');

    // Test 3: Error logging
    console.log('\n3. Testing error logging...');
    await metrics.logError('TEST_ERROR', 'Test error message', { test: true });
    console.log('✅ Error logged');

    // Test 4: Get metrics
    console.log('\n4. Testing metrics retrieval...');
    const currentMetrics = metrics.getMetrics();
    console.log('✅ Current metrics:', JSON.stringify(currentMetrics, null, 2));

    const topQuestions = metrics.getTopQuestions(5);
    console.log('✅ Top questions:', JSON.stringify(topQuestions, null, 2));

    const hourlyDistribution = metrics.getHourlyDistribution();
    console.log(
      '✅ Hourly distribution:',
      JSON.stringify(hourlyDistribution, null, 2)
    );

    // Test 5: Export metrics
    console.log('\n5. Testing metrics export...');
    const exportData = await metrics.exportMetrics('test_metrics.json');
    console.log('✅ Metrics exported:', exportData.timestamp);
  } catch (error) {
    console.error('❌ Metrics test failed:', error.message);
  }
}

async function testRAGPipelineWithCache() {
  console.log('\n=== Testing RAG Pipeline with Cache ===\n');

  const pipeline = new RAGPipeline({
    topK: 3,
    scoreThreshold: 0.6,
    enableLogging: true,
    useRedis: false, // Use memory cache
    enableMetrics: true,
  });

  try {
    // Test 1: First request (cache miss)
    console.log('1. Testing first request (cache miss)...');
    const question = 'What Chinese artists are in the collection?';

    const startTime = Date.now();
    const response1 = await pipeline.ask(question);
    const totalTime = Date.now() - startTime;

    console.log('✅ First request completed in', totalTime, 'ms');
    console.log('   Answer length:', response1.answer.length);
    console.log('   Sources found:', response1.sources.length);
    console.log('   From cache:', response1.metadata.fromCache);

    // Test 2: Second request (cache hit)
    console.log('\n2. Testing second request (cache hit)...');
    const startTime2 = Date.now();
    const response2 = await pipeline.ask(question);
    const totalTime2 = Date.now() - startTime2;

    console.log('✅ Second request completed in', totalTime2, 'ms');
    console.log('   Answer length:', response2.answer.length);
    console.log('   Sources found:', response2.sources.length);
    console.log('   From cache:', response2.metadata.fromCache);

    // Test 3: Performance comparison
    console.log('\n3. Performance comparison:');
    console.log('   First request (no cache):', totalTime, 'ms');
    console.log('   Second request (cached):', totalTime2, 'ms');
    console.log(
      '   Speed improvement:',
      Math.round(((totalTime - totalTime2) / totalTime) * 100),
      '%'
    );

    // Test 4: Get pipeline status with cache and metrics
    console.log('\n4. Testing pipeline status...');
    const status = await pipeline.getStatus();
    console.log('✅ Pipeline status:', JSON.stringify(status, null, 2));

    // Test 5: Get cache statistics
    console.log('\n5. Testing cache statistics...');
    const cacheStats = await pipeline.getCacheStats();
    console.log('✅ Cache stats:', JSON.stringify(cacheStats, null, 2));

    // Test 6: Get metrics
    console.log('\n6. Testing metrics...');
    const metrics = pipeline.getMetrics();
    console.log('✅ Metrics:', JSON.stringify(metrics, null, 2));
  } catch (error) {
    console.error('❌ RAG pipeline test failed:', error.message);
  }
}

async function main() {
  console.log('Starting Cache and Metrics Tests...\n');

  await testCache();
  await testMetrics();
  await testRAGPipelineWithCache();

  console.log('\n=== Test Summary ===');
  console.log(
    'All cache and metrics tests completed. Check the output above for results.'
  );
  console.log('Log files are saved in the ./logs directory.');
}

// Run tests if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testCache, testMetrics, testRAGPipelineWithCache };
