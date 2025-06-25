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
# Required: Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=your_pinecone_index_name

# Required: LLM Configuration
OLLAMA_MODEL=gemma2:2b

# Optional: Cache Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
CACHE_TTL=3600
CACHE_PREFIX=art_rag:

# Optional: Logging Configuration
LOG_DIR=./logs
LOG_MAX_SIZE=10485760
LOG_RETENTION_DAYS=30
```

**Required variables:**

- `PINECONE_API_KEY` - Your Pinecone API key
- `PINECONE_INDEX` - Your Pinecone index name
- `OLLAMA_MODEL` - Ollama model for text generation (default: gemma2:2b)

**Optional cache variables:**

- `REDIS_HOST` - Redis server host (default: localhost)
- `REDIS_PORT` - Redis server port (default: 6379)
- `REDIS_PASSWORD` - Redis password (if required)
- `REDIS_DB` - Redis database number (default: 0)
- `CACHE_TTL` - Cache time-to-live in seconds (default: 3600)
- `CACHE_PREFIX` - Cache key prefix (default: art_rag:)

**Optional logging variables:**

- `LOG_DIR` - Log directory path (default: ./logs)
- `LOG_MAX_SIZE` - Maximum log file size in bytes (default: 10MB)
- `LOG_RETENTION_DAYS` - Log retention period in days (default: 30)

**Available models for OLLAMA_MODEL:**

- `gemma2:2b` - Small, fast model (recommended)
- `llama3` - Larger, more capable model
- `phi3:mini` - Very small, fast model
- `mistral` - Good balance of speed and quality

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
# Upload all embeddings
npm run embed

# Upload only the first 1000 embeddings (for testing)
node scripts/embed_and_store.js embed 1000
```

This command:

- Loads chunks from `chunks.json` file
- Gets embeddings via Ollama API (nomic-embed-text model)
- Loads embeddings to Pinecone in batches of 100
- **If you specify a limit (e.g., 1000), only that many embeddings will be uploaded.**

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

### 4. Test RAG Pipeline

```bash
# Test complete RAG system
npm run test-rag
```

This will test:

- LLM connection and answer generation
- Document search functionality
- Full RAG pipeline integration

### 5. Start API Server

```bash
# Start the REST API server
npm run api
```

The API server provides:

- **Web Interface**: [http://localhost:3000](http://localhost:3000)
- **API Documentation**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **Health Check**: [http://localhost:3000/health](http://localhost:3000/health)

### 6. Use the Web Interface

1. Start the API server: `npm run api`
2. Open your browser to: [http://localhost:3000](http://localhost:3000)
3. Ask questions about the art collection
4. Use filters to narrow down searches
5. View sources and processing times

## API Endpoints

### Core RAG Endpoints

#### POST /api/ask

Ask a question and get an AI-generated answer with sources.

**Request:**

```json
{
  "question": "What Chinese artists are in the collection?",
  "topK": 5,
  "scoreThreshold": 0.6,
  "filters": {
    "medium": "Oil on canvas",
    "period": "19th century"
  }
}
```

**Response:**

```json
{
  "question": "What Chinese artists are in the collection?",
  "answer": "Based on the provided context...",
  "sources": [
    {
      "id": "96714_108192",
      "title": "Artwork Title",
      "artist": "China",
      "accession_number": "2004.261.18.7",
      "score": 0.785,
      "chunkIndex": 0
    }
  ],
  "metadata": {
    "pipelineId": "pipeline_123",
    "totalProcessingTime": 24222,
    "searchTime": 5052,
    "generationTime": 19169,
    "cacheTime": 15,
    "documentsFound": 3,
    "contextLength": 2048,
    "model": "gemma2:2b",
    "fromCache": false,
    "timestamp": "2025-06-25T04:30:00.000Z"
  }
}
```

**Parameters:**

- `question` (required): The question to ask
- `topK` (optional): Number of documents to retrieve (default: 5)
- `scoreThreshold` (optional): Minimum similarity score (default: 0.6)
- `filters` (optional): Search filters (artist, medium, period, country)

#### POST /api/search

Search for documents without generating an answer.

**Request:**

```json
{
  "question": "landscape paintings",
  "filters": {
    "medium": "Oil on canvas",
    "country": "France"
  }
}
```

**Response:**

```json
{
  "documents": [
    {
      "id": "12345_67890",
      "title": "Landscape with Trees",
      "artist": "Claude Monet",
      "accession_number": "2000.123.45",
      "score": 0.892,
      "metadata": {
        "medium": "Oil on canvas",
        "period": "19th century",
        "country": "France"
      }
    }
  ],
  "totalFound": 15,
  "processingTime": 1250
}
```

### System Status Endpoints

#### GET /api/status

Get comprehensive system health and status information.

**Response:**

```json
{
  "status": "healthy",
  "components": {
    "search": "connected",
    "llm": "connected",
    "cache": "memory"
  },
  "index": {
    "totalVectors": 15420,
    "dimension": 768
  },
  "cache": {
    "useRedis": false,
    "redisStatus": "disabled",
    "memoryCache": {
      "size": 15,
      "hits": 45,
      "misses": 30,
      "sets": 30,
      "deletes": 0,
      "hitRate": 0.6
    },
    "redis": {},
    "ttl": 3600,
    "prefix": "art_rag:"
  },
  "metrics": {
    "totalRequests": 75,
    "cacheHits": 45,
    "cacheMisses": 30,
    "averageProcessingTime": 3200,
    "totalProcessingTime": 240000,
    "errors": 2,
    "cacheHitRate": 0.6,
    "errorRate": 0.027
  },
  "configuration": {
    "topK": 5,
    "scoreThreshold": 0.6,
    "maxContextLength": 4000,
    "model": "gemma2:2b"
  },
  "timestamp": "2025-06-25T04:30:00.000Z"
}
```

#### GET /health

Simple health check endpoint.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-06-25T04:30:00.000Z",
  "uptime": 3600
}
```

### Metrics and Analytics Endpoints

#### GET /api/metrics

Get detailed system metrics and analytics.

**Response:**

```json
{
  "metrics": {
    "totalRequests": 75,
    "cacheHits": 45,
    "cacheMisses": 30,
    "averageProcessingTime": 3200,
    "totalProcessingTime": 240000,
    "errors": 2,
    "questionsByHour": {
      "14": 12,
      "15": 18,
      "16": 25,
      "17": 20
    },
    "topQuestions": {
      "what chinese artists are in the collection?": 8,
      "tell me about impressionism": 6,
      "show me renaissance paintings": 4
    },
    "documentRetrievalStats": {
      "averageDocumentsFound": 3.2,
      "averageScore": 0.78,
      "totalDocumentsRetrieved": 240
    },
    "llmStats": {
      "averageGenerationTime": 2100,
      "totalGenerationTime": 157500,
      "generations": 75
    },
    "cacheHitRate": 0.6,
    "errorRate": 0.027
  },
  "topQuestions": [
    {
      "question": "what chinese artists are in the collection?",
      "count": 8
    },
    {
      "question": "tell me about impressionism",
      "count": 6
    }
  ],
  "hourlyDistribution": {
    "14": 12,
    "15": 18,
    "16": 25,
    "17": 20
  },
  "timestamp": "2025-06-25T04:30:00.000Z"
}
```

#### GET /api/metrics/export

Export metrics data to JSON file.

**Parameters:**

- `filename` (optional): Custom filename for export

**Response:**

```json
{
  "success": true,
  "filename": "metrics_export_20250625.json",
  "data": {
    "timestamp": "2025-06-25T04:30:00.000Z",
    "metrics": { /* full metrics object */ },
    "topQuestions": [ /* top questions array */ ],
    "hourlyDistribution": { /* hourly data */ }
  },
  "timestamp": "2025-06-25T04:30:00.000Z"
}
```

### Cache Management Endpoints

#### GET /api/cache/stats

Get detailed cache performance statistics.

**Response:**

```json
{
  "useRedis": false,
  "redisStatus": "disabled",
  "memoryCache": {
    "size": 15,
    "hits": 45,
    "misses": 30,
    "sets": 30,
    "deletes": 0,
    "hitRate": 0.6
  },
  "redis": {
    "totalKeys": 0,
    "memoryUsage": 0
  },
  "ttl": 3600,
  "prefix": "art_rag:"
}
```

#### POST /api/cache/clear

Clear all cached responses.

**Response:**

```json
{
  "success": true,
  "message": "Cache cleared successfully",
  "timestamp": "2025-06-25T04:30:00.000Z"
}
```

## Caching System

The system implements intelligent caching to improve response times and reduce computational load.

### Cache Features

- **Multi-level Caching**: Redis (primary) with memory fallback
- **Smart Key Generation**: SHA-256 hash based on question + parameters
- **Configurable TTL**: Default 1 hour, customizable per request
- **Automatic Fallback**: Falls back to memory cache if Redis unavailable
- **Cache Statistics**: Hit rates, misses, and performance metrics

### Cache Configuration

**Environment Variables:**

```env
# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# Cache Settings
CACHE_TTL=3600
CACHE_PREFIX=art_rag:
```

**Cache Behavior:**

- Questions with identical parameters return cached responses
- Different `topK`, `scoreThreshold`, or `filters` create separate cache entries
- Cache keys include model name for model-specific caching
- Automatic cache invalidation after TTL expiration

### Cache Performance

Typical performance improvements:

- **First request**: 2-8 seconds (full processing)
- **Cached request**: 10-50ms (cache retrieval)
- **Speed improvement**: 95-99% faster for repeated questions

## Metrics and Logging

The system provides comprehensive metrics collection and logging for monitoring and optimization.

### Metrics Collection

**Performance Metrics:**

- Total requests and processing times
- Cache hit rates and performance
- Document retrieval statistics
- LLM generation times
- Error rates and types

**Usage Analytics:**

- Most popular questions
- Hourly activity patterns
- User behavior trends
- System utilization

**Quality Metrics:**

- Average document relevance scores
- Context length optimization
- Response quality indicators

### Logging System

**Log Files Location:** `./logs/`

**Log Types:**

- `rag_requests.log` - RAG pipeline requests and responses
- `search_requests.log` - Document search operations
- `errors.log` - System errors and exceptions
- `system_metrics.log` - Periodic system performance snapshots

**Log Format (JSON):**

```json
{
  "timestamp": "2025-06-25T04:30:00.000Z",
  "type": "rag_request",
  "request": {
    "question": "What is impressionism?",
    "topK": 5,
    "scoreThreshold": 0.6
  },
  "response": {
    "answerLength": 450,
    "sourcesCount": 3,
    "averageScore": 0.78
  },
  "timing": {
    "totalTime": 3200,
    "searchTime": 800,
    "generationTime": 2400,
    "cacheTime": 15
  },
  "cache": {
    "hit": false,
    "key": "art_rag:abc123..."
  },
  "metadata": {
    "pipelineId": "pipeline_123",
    "model": "gemma2:2b",
    "documentsFound": 3
  }
}
```

### Log Management

**Automatic Features:**

- Log rotation when files exceed 10MB
- 30-day retention policy
- Automatic log directory creation
- Error handling for log write failures

**Manual Operations:**

```bash
# Export metrics
curl "http://localhost:3000/api/metrics/export?filename=my_metrics.json"

# Clear old logs (automatic)
# Logs older than 30 days are automatically removed

# View log files
tail -f logs/rag_requests.log
tail -f logs/errors.log
```

## Web Interface Features

- **Real-time Chat**: Ask questions and get AI-generated answers
- **Document Search**: Search with filters (artist, medium, period, country)
- **Source Display**: View the documents used to generate answers
- **Performance Metrics**: See processing times and model information
- **System Status**: Monitor API, search index, and LLM status
- **Cache Management**: View cache statistics and clear cache
- **Analytics Dashboard**: Top questions, hourly activity, performance metrics
- **Responsive Design**: Works on desktop and mobile devices

### New Metrics Dashboard

The web interface now includes a comprehensive metrics dashboard:

**System Performance Card:**

- Total requests and cache hit rate
- Average processing times
- Error rates and document retrieval stats

**Cache Statistics Card:**

- Cache type (Redis/Memory) and status
- Hit/miss statistics and hit rate
- Cache size and TTL information
- Clear cache button

**Top Questions Card:**

- Most frequently asked questions
- Question frequency counts
- Real-time updates

**Hourly Activity Card:**

- 24-hour activity chart
- Visual representation of usage patterns
- Interactive bar chart

## Project Structure

```text
art_rag_ai/
├── api/
│   └── server.js              # REST API server
├── public/
│   └── index.html             # Web interface
├── scripts/
│   ├── load_and_process.js    # Document processing
│   ├── embed_and_store.js     # Embedding creation and Pinecone work
│   ├── search_documents.js    # Document search functionality
│   ├── llm_integration.js     # LLM integration
│   ├── rag_pipeline.js        # Complete RAG pipeline
│   ├── cache_manager.js       # Caching system (Redis + Memory)
│   ├── metrics_logger.js      # Metrics collection and logging
│   ├── test_llm.js           # LLM and RAG testing
│   ├── test_ollama.js        # Ollama test
│   ├── test_pinecone.js      # Pinecone test
│   ├── test_openai.js        # OpenAI test (if needed)
│   ├── test_cache_metrics.js # Cache and metrics testing
│   └── check_env.js          # Environment configuration check
├── logs/                      # Log files (auto-generated)
│   ├── rag_requests.log      # RAG request logs
│   ├── search_requests.log   # Search request logs
│   ├── errors.log            # Error logs
│   └── system_metrics.log    # System performance logs
├── collection/                # Collection data (downloaded automatically)
├── chunks.json               # Processed document chunks
├── package.json
└── README.md
```

## NPM Commands

| Command | Description |
|---------|-------------|
| `npm run download-collection` | Download collection |
| `npm run process` | Process documents (console output) |
| `npm run save-chunks` | Process and save chunks to file |
| `npm run embed` | Create embeddings and load to Pinecone (all) |
| `node scripts/embed_and_store.js embed 1000` | Create and upload only 1000 embeddings (for testing) |
| `npm run search` | Search the collection |
| `npm run test-rag` | Test complete RAG pipeline |
| `npm run test-cache-metrics` | Test caching and metrics functionality |
| `npm run api` | Start REST API server |
| `npm run dev` | Start API server (alias) |
| `npm run test-ollama` | Test Ollama connection |
| `npm run test-pinecone` | Test Pinecone connection |
| `npm run test-openai` | Test OpenAI connection |
| `npm run check-env` | Check environment configuration |

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
# Start Ollama service
ollama serve

# List available models
ollama list

# Show model information
ollama show nomic-embed-text

# Run a model interactively
ollama run phi3:mini

# Stop a running model
ollama stop phi3:mini

# Pull a model from registry
ollama pull phi3:mini

# Push a model to registry
ollama push my-model

# Create a model from Modelfile
ollama create my-model -f Modelfile

# Copy a model
ollama cp phi3:mini phi3:mini-copy

# Remove a model
ollama rm phi3:mini

# List running models
ollama ps

# Show version
ollama -v
```

## License

MIT
