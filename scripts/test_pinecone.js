require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function testPinecone() {
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    // Пробуем получить объект индекса
    const index = pinecone.index(process.env.PINECONE_INDEX);
    // Попробуем получить stats или описание индекса
    const stats = await index.describeIndexStats();
    console.log(`Индекс ${process.env.PINECONE_INDEX} доступен!`);
    console.log('Статистика индекса:', stats);
  } catch (err) {
    console.error(
      'Ошибка подключения к Pinecone или индекса не существует:',
      err
    );
  }
}

testPinecone();
