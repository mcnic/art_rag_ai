const fetch = require('node-fetch');

async function testOllama() {
  try {
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: 'Hello, Ollama!',
      }),
    });
    const data = await response.json();
    if (data.embedding) {
      console.log(
        'Ollama is working! Example embedding:',
        data.embedding.slice(0, 5),
        '...'
      );
    } else {
      console.error('Error: embedding not received. Response:', data);
    }
  } catch (err) {
    console.error('Error connecting to Ollama:', err.message || err);
  }
}

testOllama();
