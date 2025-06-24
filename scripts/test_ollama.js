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
        'Ollama работает! Пример embedding:',
        data.embedding.slice(0, 5),
        '...'
      );
    } else {
      console.error('Ошибка: embedding не получен. Ответ:', data);
    }
  } catch (err) {
    console.error('Ошибка подключения к Ollama:', err.message || err);
  }
}

testOllama();
