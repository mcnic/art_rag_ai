# Art RAG AI

RAG (Retrieval-Augmented Generation) system for working with the Minneapolis Institute of Art collection.

## Description

The system allows you to:

- Load and process data from the art collection
- Create vector representations (embeddings) using local LLM
- Store embeddings in Pinecone vector database
- Perform semantic search across the collection
- Generate answers to questions based on found documents

## Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd art_rag_ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Install Ollama

#### Linux

**Automatic installation:**

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Manual installation (Ubuntu/Debian):**

```bash
# Add repository
curl -fsSL https://ollama.com/install.sh | sh

# Or via apt
sudo apt update
sudo apt install ollama
```

**Arch Linux:**

```bash
yay -S ollama-bin
```

#### macOS

**Via Homebrew:**

```bash
brew install ollama
```

**Via installer:**

1. Download the installer from [https://ollama.com/download](https://ollama.com/download)
2. Open the downloaded file and follow the instructions

#### Windows

1. Download the installer from [https://ollama.com/download](https://ollama.com/download)
2. Run the installer and follow the instructions
3. Restart your computer after installation

#### Docker

```bash
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```

### 4. Start Ollama

#### First run

```bash
# Start the service
ollama serve
```

**Note:** On first run, Ollama may request network access permissions.

#### Auto-start (Linux/macOS)

```bash
# Enable auto-start
sudo systemctl enable ollama

# Start the service
sudo systemctl start ollama

# Check status
sudo systemctl status ollama
```

#### Verify Ollama is working

```bash
# Check version
ollama --version

# Check service status
curl http://localhost:11434/api/tags
```

### 5. Model Management

#### List available models

```bash
# Show all available models
ollama list

# Show models in registry
ollama list --remote
```

#### Download nomic-embed-text model

```bash
# Download model for embeddings
ollama pull nomic-embed-text

# Verify download
ollama list
```

#### Other useful models

```bash
# Text generation models
ollama pull llama3
ollama pull mistral
ollama pull phi3

# Alternative embedding models
ollama pull llama2-embed
ollama pull all-minilm
```

#### Model management

```bash
# Remove model
ollama rm nomic-embed-text

# Reload model
ollama pull nomic-embed-text

# Show model information
ollama show nomic-embed-text
```

### 6. Environment variables

Create a `.env` file in the project root:

```env
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=your_pinecone_index_name
```

## Pinecone Setup

1. Create an account at [https://www.pinecone.io/](https://www.pinecone.io/)
2. Create a new index:

   - **Name:** any unique name (e.g., `art-collection`)
   - **Dimension:** 768 (for nomic-embed-text)
   - **Metric:** cosine
   - **Pod Type:** starter (for free tier)

3. Copy the API Key and index name to your `.env` file

## Testing

### Test Ollama connection

```bash
npm run test-ollama
```

Expected output:

```text
Ollama is working! Example embedding: [0.123, -0.456, 0.789, -0.321, 0.654] ...
```

### Test Pinecone connection

```bash
npm run test-pinecone
```

Expected output:

```text
Index your_index_name is available!
Index statistics: { ... }
```

## Usage

### 1. Load and process data

```bash
# Download collection and process documents
npm run save-chunks
```

This command:

- Downloads the art collection repository
- Processes JSON files and extracts text data
- Splits documents into chunks of 750 characters with 75 character overlap
- Saves chunks to `chunks.json` file

### 2. Create embeddings and load to Pinecone

```bash
npm run embed
```

This command:

- Loads chunks from `chunks.json` file
- Gets embeddings via Ollama API (nomic-embed-text model)
- Loads embeddings to Pinecone in batches of 100

### 3. Search the collection

```bash
npm run search -- "your search query"
```

Example queries:

```bash
npm run search -- "Rembrandt paintings"
npm run search -- "Ancient Greek sculptures"
npm run search -- "impressionism"
```

## Project Structure

```text
art_rag_ai/
├── scripts/
│   ├── load_and_process.js      # Document processing
│   ├── embed_and_store.js       # Embedding creation and Pinecone work
│   ├── test_ollama.js          # Ollama test
│   ├── test_pinecone.js        # Pinecone test
│   └── test_openai.js          # OpenAI test (if needed)
├── collection/                  # Collection data (downloaded automatically)
├── chunks.json                 # Processed document chunks
├── package.json
└── README.md
```

## NPM Commands

| Command | Description |
|---------|-------------|
| `npm run download-collection` | Download collection |
| `npm run process` | Process documents (console output) |
| `npm run save-chunks` | Process and save chunks to file |
| `npm run embed` | Create embeddings and load to Pinecone |
| `npm run search` | Search the collection |
| `npm run test-ollama` | Test Ollama connection |
| `npm run test-pinecone` | Test Pinecone connection |
| `npm run test-openai` | Test OpenAI connection |

## Requirements

- Node.js 16+
- Ollama with nomic-embed-text model
- Pinecone account
- Minimum 4 GB RAM (for nomic-embed-text)
- 5+ GB free disk space

## Troubleshooting

### Ollama Issues

#### Ollama won't start

```bash
# Check service status
sudo systemctl status ollama

# Restart service
sudo systemctl restart ollama

# Check logs
sudo journalctl -u ollama -f
```

#### "Permission denied" error

```bash
# Add user to ollama group
sudo usermod -a -G ollama $USER

# Reboot system or re-login
sudo reboot
```

#### "Port already in use" error

```bash
# Find process using port 11434
sudo lsof -i :11434

# Stop the process
sudo kill -9 <PID>
```

#### Model won't load

```bash
# Check free space
df -h

# Clear cache
ollama rm nomic-embed-text
ollama pull nomic-embed-text
```

#### "Cannot find module '@pinecone-database/pinecone'"

```bash
npm install @pinecone-database/pinecone
```

#### "Cannot find module 'node-fetch'"

```bash
npm install node-fetch
```

#### Ollama connection error

1. Make sure Ollama service is running: `ollama serve`
2. Check that model is loaded: `ollama list`
3. Reload model if needed: `ollama pull nomic-embed-text`
4. Check API availability: `curl http://localhost:11434/api/tags`

#### Pinecone connection error

1. Check API Key correctness in `.env` file
2. Make sure index exists and is accessible
3. Verify index dimension matches model (768 for nomic-embed-text)

### Useful Ollama Commands

```bash
# System information
ollama info

# Ollama logs
ollama logs

# Clean unused models
ollama prune

# Export model
ollama export nomic-embed-text > model.tar

# Import model
ollama import model.tar
```

## License

MIT
