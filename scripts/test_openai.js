require('dotenv').config();
const { OpenAI } = require('openai');

async function testOpenAI() {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Try to get embedding for simple text
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: 'Hello, OpenAI!',
    });

    console.log(
      'OpenAI API is working! Example embedding:',
      response.data[0].embedding.slice(0, 5),
      '...'
    );
  } catch (err) {
    console.error('Error connecting to OpenAI API:', err.message || err);
  }
}

testOpenAI();
