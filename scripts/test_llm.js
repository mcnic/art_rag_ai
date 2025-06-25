const { LLMIntegration } = require('./llm_integration');
const { RAGPipeline } = require('./rag_pipeline');
require('dotenv').config();

async function testLLMIntegration() {
  console.log('=== Testing LLM Integration ===\n');

  // Test 1: Basic LLM connection
  console.log('1. Testing LLM connection...');
  const defaultModel = process.env.OLLAMA_MODEL || 'gemma2:2b';
  const llm = new LLMIntegration(defaultModel);

  try {
    const connectionTest = await llm.testConnection();
    if (connectionTest) {
      console.log('✅ LLM connection successful');
    } else {
      console.log('❌ LLM connection failed');
      return;
    }
  } catch (error) {
    console.log(`❌ LLM connection error: ${error.message}`);
    return;
  }

  // Test 2: Context formatting
  console.log('\n2. Testing context formatting...');
  const mockDocuments = [
    {
      metadata: {
        title: 'Landscape with Mountains',
        artist: 'John Smith',
        accession_number: '2023.1.1',
        medium: 'Oil on canvas',
        period: '19th century',
        text: 'A beautiful landscape painting depicting mountains and valleys.',
      },
      score: 0.85,
    },
    {
      metadata: {
        title: 'Portrait of a Lady',
        artist: 'Jane Doe',
        accession_number: '2023.1.2',
        medium: 'Watercolor',
        period: '20th century',
        text: 'An elegant portrait of a woman in traditional dress.',
      },
      score: 0.78,
    },
  ];

  const formattedContext = llm.formatContext(mockDocuments);
  console.log('✅ Context formatting successful');
  console.log(`Context length: ${formattedContext.length} characters`);
  console.log('Sample context:');
  console.log(formattedContext.substring(0, 200) + '...');

  // Test 3: Answer generation
  console.log('\n3. Testing answer generation...');
  try {
    const testQuestion = 'What types of paintings are in the collection?';
    const response = await llm.generateAnswer(formattedContext, testQuestion);

    console.log('✅ Answer generation successful');
    console.log(`Question: ${testQuestion}`);
    console.log(`Answer: ${response.answer.substring(0, 200)}...`);
    console.log(`Processing time: ${response.processingTime}ms`);
    console.log(`Model: ${response.model}`);
  } catch (error) {
    console.log(`❌ Answer generation failed: ${error.message}`);
  }
}

async function testRAGPipeline() {
  console.log('\n=== Testing RAG Pipeline ===\n');

  const pipeline = new RAGPipeline({
    topK: 3,
    scoreThreshold: 0.6,
    enableLogging: true,
  });

  // Test 1: Pipeline status
  console.log('1. Testing pipeline status...');
  try {
    const status = await pipeline.getStatus();
    console.log('✅ Pipeline status check successful');
    console.log('Status:', status.status);
    console.log('Components:', status.components);
    console.log('Index vectors:', status.index?.totalVectors);
  } catch (error) {
    console.log(`❌ Pipeline status check failed: ${error.message}`);
    return;
  }

  // Test 2: Simple question
  console.log('\n2. Testing simple question...');
  try {
    const response = await pipeline.ask(
      'What Chinese artists are in the collection?'
    );

    console.log('✅ RAG pipeline successful');
    console.log(`Question: ${response.question}`);
    console.log(`Answer: ${response.answer.substring(0, 300)}...`);
    console.log(`Sources: ${response.sources.length} documents`);
    console.log(`Total time: ${response.metadata.totalProcessingTime}ms`);

    if (response.sources.length > 0) {
      console.log('Top source:');
      console.log(
        `  - ${response.sources[0].title} by ${response.sources[0].artist}`
      );
      console.log(`  - Score: ${response.sources[0].score.toFixed(3)}`);
    }
  } catch (error) {
    console.log(`❌ RAG pipeline failed: ${error.message}`);
  }

  // Test 3: Question with filters
  console.log('\n3. Testing question with filters...');
  try {
    const response = await pipeline.ask('Tell me about landscape paintings', {
      filters: { medium: 'Oil on canvas' },
      topK: 2,
    });

    console.log('✅ Filtered RAG pipeline successful');
    console.log(`Question: ${response.question}`);
    console.log(`Answer: ${response.answer.substring(0, 300)}...`);
    console.log(`Sources: ${response.sources.length} documents`);
    console.log(`Total time: ${response.metadata.totalProcessingTime}ms`);
  } catch (error) {
    console.log(`❌ Filtered RAG pipeline failed: ${error.message}`);
  }
}

async function main() {
  console.log('Starting LLM and RAG Pipeline Tests...\n');

  await testLLMIntegration();
  await testRAGPipeline();

  console.log('\n=== Test Summary ===');
  console.log('All tests completed. Check the output above for results.');
}

// Run tests if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testLLMIntegration, testRAGPipeline };
