require('dotenv').config();
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { Pinecone } = require('@pinecone-database/pinecone');
const fs = require('fs/promises');
const path = require('path');

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

async function loadChunks() {
  // Для простоты сохраняем чанки в файл, например, chunks.json
  const filePath = path.join(__dirname, 'chunks.json');
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

async function embedAndStore() {
  const chunks = await loadChunks();
  const openai = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'text-embedding-ada-002',
  });

  const pinecone = new Pinecone({
    apiKey: PINECONE_API_KEY,
    environment: PINECONE_ENVIRONMENT,
  });
  const index = pinecone.Index(PINECONE_INDEX);

  // Batch upserts (Pinecone рекомендует до 100 за раз)
  const batchSize = 100;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map((doc) => doc.pageContent);
    const embeddings = await openai.embedDocuments(texts);
    const vectors = batch.map((doc, idx) => ({
      id: `${doc.metadata.id || doc.metadata.source}_${i + idx}`,
      values: embeddings[idx],
      metadata: doc.metadata,
    }));
    await index.upsert(vectors);
    console.log(`Upserted ${i + batch.length} / ${chunks.length}`);
  }
  console.log('All embeddings stored in Pinecone!');
}

async function searchPinecone(query, topK = 5) {
  const openai = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'text-embedding-ada-002',
  });
  const pinecone = new Pinecone({
    apiKey: PINECONE_API_KEY,
    environment: PINECONE_ENVIRONMENT,
  });
  const index = pinecone.Index(PINECONE_INDEX);
  const embedding = await openai.embedQuery(query);
  const results = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
  });
  return results.matches;
}

// Для запуска: node embed_and_store.js embed
// или поиска: node embed_and_store.js search "ваш запрос"
if (require.main === module) {
  const [, , cmd, ...args] = process.argv;
  if (cmd === 'embed') {
    embedAndStore();
  } else if (cmd === 'search') {
    const query = args.join(' ');
    searchPinecone(query).then((res) => {
      console.log('Search results:', res);
    });
  } else {
    console.log('Usage: node embed_and_store.js [embed|search "query"]');
  }
}

module.exports = { embedAndStore, searchPinecone };
