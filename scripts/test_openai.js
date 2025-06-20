require('dotenv').config();
const { OpenAI } = require('openai');

async function testOpenAI() {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Пробуем получить embedding для простого текста
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: 'Hello, OpenAI!',
    });

    console.log(
      'OpenAI API работает! Пример embedding:',
      response.data[0].embedding.slice(0, 5),
      '...'
    );
  } catch (err) {
    console.error('Ошибка подключения к OpenAI API:', err.message || err);
  }
}

testOpenAI();
