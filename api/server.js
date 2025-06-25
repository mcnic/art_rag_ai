const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { RAGPipeline } = require('../scripts/rag_pipeline');
const { DocumentSearcher } = require('../scripts/search_documents');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize RAG pipeline
const ragPipeline = new RAGPipeline({
  topK: 5,
  scoreThreshold: 0.6,
  enableLogging: false, // Disable console logging for API
});

const documentSearcher = new DocumentSearcher();

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'http://localhost:3000',
          'http://127.0.0.1:3000',
        ],
      },
    },
  })
);
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Art RAG AI API',
      version: '1.0.0',
      description:
        'REST API for Art RAG AI system - Minneapolis Institute of Art collection',
      contact: {
        name: 'Art RAG AI',
        url: 'https://github.com/your-repo/art_rag_ai',
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        QuestionRequest: {
          type: 'object',
          required: ['question'],
          properties: {
            question: {
              type: 'string',
              description: 'The question to ask about the art collection',
              example: 'What Chinese artists are in the collection?',
            },
            topK: {
              type: 'integer',
              description: 'Number of documents to retrieve (default: 5)',
              minimum: 1,
              maximum: 20,
              example: 5,
            },
            scoreThreshold: {
              type: 'number',
              description: 'Minimum similarity score (default: 0.6)',
              minimum: 0,
              maximum: 1,
              example: 0.6,
            },
            filters: {
              type: 'object',
              description: 'Additional filters for search',
              properties: {
                artist: { type: 'string', example: 'Rembrandt' },
                medium: { type: 'string', example: 'Oil on canvas' },
                period: { type: 'string', example: '19th century' },
                country: { type: 'string', example: 'Netherlands' },
              },
            },
          },
        },
        RAGResponse: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            answer: { type: 'string' },
            sources: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  artist: { type: 'string' },
                  accession_number: { type: 'string' },
                  score: { type: 'number' },
                  chunkIndex: { type: 'number' },
                },
              },
            },
            metadata: {
              type: 'object',
              properties: {
                pipelineId: { type: 'string' },
                totalProcessingTime: { type: 'number' },
                searchTime: { type: 'number' },
                generationTime: { type: 'number' },
                documentsFound: { type: 'number' },
                model: { type: 'string' },
                timestamp: { type: 'string' },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./api/server.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Art RAG AI API',
    version: '1.0.0',
  });
});

// Input validation middleware
function validateQuestionRequest(req, res, next) {
  const { question, topK, scoreThreshold, filters } = req.body;

  if (
    !question ||
    typeof question !== 'string' ||
    question.trim().length === 0
  ) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Question is required and must be a non-empty string',
      timestamp: new Date().toISOString(),
    });
  }

  if (question.length > 1000) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Question is too long (max 1000 characters)',
      timestamp: new Date().toISOString(),
    });
  }

  if (topK && (typeof topK !== 'number' || topK < 1 || topK > 20)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'topK must be a number between 1 and 20',
      timestamp: new Date().toISOString(),
    });
  }

  if (
    scoreThreshold &&
    (typeof scoreThreshold !== 'number' ||
      scoreThreshold < 0 ||
      scoreThreshold > 1)
  ) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'scoreThreshold must be a number between 0 and 1',
      timestamp: new Date().toISOString(),
    });
  }

  if (filters && typeof filters !== 'object') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'filters must be an object',
      timestamp: new Date().toISOString(),
    });
  }

  next();
}

/**
 * @swagger
 * /api/ask:
 *   post:
 *     summary: Ask a question about the art collection
 *     description: Use RAG pipeline to search for relevant documents and generate an answer
 *     tags: [RAG]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuestionRequest'
 *     responses:
 *       200:
 *         description: Successful response with answer and sources
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RAGResponse'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/ask', validateQuestionRequest, async (req, res) => {
  try {
    const { question, topK, scoreThreshold, filters } = req.body;

    const options = {};
    if (topK) options.topK = topK;
    if (scoreThreshold) options.scoreThreshold = scoreThreshold;
    if (filters) options.filters = filters;

    const response = await ragPipeline.ask(question, options);

    res.json(response);
  } catch (error) {
    console.error('RAG API error:', error);
    res.status(500).json({
      error: 'RAG_ERROR',
      message: error.message || 'Failed to process question',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/search:
 *   post:
 *     summary: Search for documents without generating an answer
 *     description: Search for relevant documents in the collection
 *     tags: [Search]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuestionRequest'
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 query:
 *                   type: string
 *                 documents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       score: { type: number }
 *                       metadata: { type: object }
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
app.post('/api/search', validateQuestionRequest, async (req, res) => {
  try {
    const { question, topK, scoreThreshold, filters } = req.body;

    let documents;
    if (filters && Object.keys(filters).length > 0) {
      documents = await documentSearcher.searchWithFilters(
        question,
        filters,
        topK || 5
      );
    } else {
      documents = await documentSearcher.searchDocuments(
        question,
        topK || 5,
        scoreThreshold || 0.6
      );
    }

    res.json({
      query: question,
      documents: documents.map((doc) => ({
        id: doc.id,
        score: doc.score,
        metadata: doc.metadata,
      })),
      total: documents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({
      error: 'SEARCH_ERROR',
      message: error.message || 'Failed to search documents',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: Get system status
 *     description: Check the health and status of all components
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 components: { type: object }
 *                 index: { type: object }
 *                 configuration: { type: object }
 *                 timestamp: { type: string }
 */
app.get('/api/status', async (req, res) => {
  try {
    const status = await ragPipeline.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Status API error:', error);
    res.status(500).json({
      error: 'STATUS_ERROR',
      message: error.message || 'Failed to get system status',
      timestamp: new Date().toISOString(),
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Art RAG AI API server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔍 RAG Endpoint: http://localhost:${PORT}/api/ask`);
  console.log(`🔎 Search Endpoint: http://localhost:${PORT}/api/search`);
});

module.exports = app;
