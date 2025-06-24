require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const fs = require('fs/promises');
const path = require('path');
const fetch = require('node-fetch');

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

// Function to clean metadata (Pinecone accepts only strings, numbers, booleans)
function cleanMetadata(metadata) {
  const cleaned = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      cleaned[key] = value;
    } else if (
      Array.isArray(value) &&
      value.every((item) => typeof item === 'string')
    ) {
      cleaned[key] = value;
    } else if (value !== null && value !== undefined) {
      // Convert complex objects to strings
      cleaned[key] = JSON.stringify(value);
    }
  }
  return cleaned;
}

// Function to get embedding via Ollama
async function getEmbedding(text) {
  const response = await fetch('http://localhost:11434/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'nomic-embed-text',
      prompt: text,
    }),
  });
  const data = await response.json();
  return data.embedding;
}

// Function to get embeddings for array of texts
async function getEmbeddings(texts) {
  const embeddings = [];
  for (const text of texts) {
    const embedding = await getEmbedding(text);
    embeddings.push(embedding);
  }
  return embeddings;
}

async function loadChunks() {
  // For simplicity, save chunks to file, e.g., chunks.json
  const filePath = path.join(__dirname, '..', 'chunks.json');
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

async function embedAndStore() {
  const chunks = await loadChunks();
  const pinecone = new Pinecone({
    apiKey: PINECONE_API_KEY,
  });
  const index = pinecone.Index(PINECONE_INDEX);

  // Batch upserts (Pinecone recommends up to 100 at a time)
  const batchSize = 100;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map((doc) => doc.pageContent);
    const embeddings = await getEmbeddings(texts);
    const vectors = batch.map((doc, idx) => ({
      id: `${doc.metadata.id || doc.metadata.source}_${i + idx}`,
      values: embeddings[idx],
      metadata: cleanMetadata(doc.metadata),
    }));
    await index.upsert(vectors);
    console.log(`Upserted ${i + batch.length} / ${chunks.length}`);
  }
  console.log('All embeddings stored in Pinecone!');
}

async function searchPinecone(query, topK = 5) {
  const pinecone = new Pinecone({
    apiKey: PINECONE_API_KEY,
  });
  const index = pinecone.Index(PINECONE_INDEX);
  const embedding = await getEmbedding(query);
  const results = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
  });
  return results.matches;
}

// For running: node embed_and_store.js embed
// or search: node embed_and_store.js search "your query"
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
