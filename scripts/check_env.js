require('dotenv').config();

async function checkEnvironment() {
  console.log('=== Environment Variables Check ===');
  console.log(
    'PINECONE_API_KEY:',
    process.env.PINECONE_API_KEY ? 'Set' : 'Not set'
  );
  console.log('PINECONE_INDEX:', process.env.PINECONE_INDEX || 'Not set');
  console.log(
    'OLLAMA_BASE_URL:',
    process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  );

  // Test Pinecone connection if API key is available
  if (process.env.PINECONE_API_KEY) {
    const { Pinecone } = require('@pinecone-database/pinecone');

    try {
      const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });

      console.log('\n=== Pinecone Connection Test ===');
      console.log('Connected to Pinecone successfully');

      // List all indexes
      const indexes = await pinecone.listIndexes();
      console.log('Available indexes:', indexes);

      if (process.env.PINECONE_INDEX) {
        try {
          const index = pinecone.index(process.env.PINECONE_INDEX);
          const stats = await index.describeIndexStats();
          console.log(`\nIndex "${process.env.PINECONE_INDEX}" stats:`);
          console.log('Total vectors:', stats.totalVectorCount);
          console.log('Dimension:', stats.dimension);
        } catch (error) {
          console.log(
            `\nError accessing index "${process.env.PINECONE_INDEX}":`,
            error.message
          );
        }
      } else {
        console.log(
          '\nPINECONE_INDEX not set. Waiting for embedding upload to complete...'
        );
      }
    } catch (error) {
      console.log('Error connecting to Pinecone:', error.message);
    }
  } else {
    console.log(
      '\nPinecone API key not set. Please set PINECONE_API_KEY in your environment.'
    );
  }
}

// Run the check
checkEnvironment().catch(console.error);
