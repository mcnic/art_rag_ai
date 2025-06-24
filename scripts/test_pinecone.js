require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function testPinecone() {
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    // Try to get index object
    const index = pinecone.index(process.env.PINECONE_INDEX);
    // Try to get stats or index description
    const stats = await index.describeIndexStats();
    console.log(`Index ${process.env.PINECONE_INDEX} is available!`);
    console.log('Index statistics:', stats);
  } catch (err) {
    console.error('Error connecting to Pinecone or index does not exist:', err);
  }
}

testPinecone();
