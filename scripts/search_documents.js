// Search configuration constants
const BASIC_SEARCH_QUERY = 'china artists';
const FILTERED_SEARCH_QUERY = 'landscape painting';
const FILTERED_SEARCH_FILTERS = {}; // example:{ medium: 'Oil on canvas' };
const TOP_K = 3;
const SCORE_THRESHOLD = 0.7;

const { Pinecone } = require('@pinecone-database/pinecone');
const { OllamaEmbeddings } = require('@langchain/community/embeddings/ollama');
require('dotenv').config();

class DocumentSearcher {
  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    this.index = this.pinecone.index(process.env.PINECONE_INDEX);
    this.embeddings = new OllamaEmbeddings({
      model: 'nomic-embed-text',
    });
  }

  /**
   * Search for the most relevant documents based on a query
   * @param {string} query - The search query
   * @param {number} topK - Number of top results to return (default: 5)
   * @param {number} scoreThreshold - Minimum similarity score (default: 0.7)
   * @returns {Promise<Array>} Array of relevant documents with metadata
   */
  async searchDocuments(query, topK = 5, scoreThreshold = 0.7) {
    try {
      console.log(`Searching for: "${query}"`);

      // Generate embedding for the query
      const queryEmbedding = await this.embeddings.embedQuery(query);

      // Search in Pinecone
      const searchResponse = await this.index.query({
        vector: queryEmbedding,
        topK: topK,
        includeMetadata: true,
        includeValues: false,
      });

      // Filter results by score threshold and format response
      const relevantDocuments = searchResponse.matches
        .filter((match) => match.score >= scoreThreshold)
        .map((match) => ({
          id: match.id,
          score: match.score,
          metadata: match.metadata,
          content: match.metadata.text || match.metadata.content,
          artworkId: match.metadata.artworkId,
          title: match.metadata.title,
          artist: match.metadata.artist,
          chunkIndex: match.metadata.chunkIndex,
        }));

      console.log(`Found ${relevantDocuments.length} relevant documents`);

      return relevantDocuments;
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  /**
   * Search with additional filters
   * @param {string} query - The search query
   * @param {Object} filters - Additional filters (artist, medium, period, etc.)
   * @param {number} topK - Number of top results
   * @returns {Promise<Array>} Filtered search results
   */
  async searchWithFilters(query, filters = {}, topK = 5) {
    try {
      console.log(`Searching with filters:`, filters);

      const queryEmbedding = await this.embeddings.embedQuery(query);

      // Build filter object for Pinecone
      const pineconeFilters = {};
      if (filters.artist) {
        pineconeFilters.artist = { $eq: filters.artist };
      }
      if (filters.medium) {
        pineconeFilters.medium = { $eq: filters.medium };
      }
      if (filters.period) {
        pineconeFilters.period = { $eq: filters.period };
      }
      if (filters.country) {
        pineconeFilters.country = { $eq: filters.country };
      }

      const searchResponse = await this.index.query({
        vector: queryEmbedding,
        topK: topK,
        includeMetadata: true,
        includeValues: false,
        filter:
          Object.keys(pineconeFilters).length > 0 ? pineconeFilters : undefined,
      });

      const relevantDocuments = searchResponse.matches.map((match) => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata,
        content: match.metadata.text || match.metadata.content,
        artworkId: match.metadata.artworkId,
        title: match.metadata.title,
        artist: match.metadata.artist,
        medium: match.metadata.medium,
        period: match.metadata.period,
        country: match.metadata.country,
        chunkIndex: match.metadata.chunkIndex,
      }));

      console.log(`Found ${relevantDocuments.length} filtered documents`);

      return relevantDocuments;
    } catch (error) {
      console.error('Error searching with filters:', error);
      throw error;
    }
  }

  /**
   * Get document by ID
   * @param {string} documentId - The document ID
   * @returns {Promise<Object>} Document data
   */
  async getDocumentById(documentId) {
    try {
      const fetchResponse = await this.index.fetch([documentId]);
      const document = fetchResponse.records[documentId];

      if (!document) {
        throw new Error(`Document with ID ${documentId} not found`);
      }

      return {
        id: document.id,
        metadata: document.metadata,
        content: document.metadata.text || document.metadata.content,
        artworkId: document.metadata.artworkId,
        title: document.metadata.title,
        artist: document.metadata.artist,
      };
    } catch (error) {
      console.error('Error fetching document by ID:', error);
      throw error;
    }
  }

  /**
   * Get statistics about the search index
   * @returns {Promise<Object>} Index statistics
   */
  async getIndexStats() {
    try {
      const stats = await this.index.describeIndexStats();
      return {
        totalVectorCount: stats.totalVectorCount,
        dimension: stats.dimension,
        namespaces: stats.namespaces,
      };
    } catch (error) {
      console.error('Error getting index stats:', error);
      throw error;
    }
  }
}

// Example usage and testing
async function testSearch() {
  const searcher = new DocumentSearcher();

  try {
    // Get index statistics
    console.log('=== Index Statistics ===');
    const stats = await searcher.getIndexStats();
    console.log('Total vectors:', stats.totalVectorCount);
    console.log('Dimension:', stats.dimension);
    console.log('Namespaces:', Object.keys(stats.namespaces || {}));
    console.log();

    // Test basic search
    console.log('=== Basic Search Test ===');
    const results = await searcher.searchDocuments(
      BASIC_SEARCH_QUERY,
      TOP_K,
      SCORE_THRESHOLD
    );
    results.forEach((doc, index) => {
      console.log(`${index + 1}. Score: ${doc.score.toFixed(3)}`);
      console.log(` metadata: ${JSON.stringify(doc.metadata)}`);
      console.log(`   Title: ${doc.metadata.title || 'N/A'}`);
      console.log(`   Artist: ${doc.metadata.artist || 'N/A'}`);
      console.log(
        `   Text: ${
          doc.metadata.text
            ? doc.metadata.text.substring(0, 200) +
              (doc.metadata.text.length > 200 ? '...' : '')
            : 'N/A'
        }`
      );
      console.log(
        `   Accession Number: ${doc.metadata.accession_number || 'N/A'}`
      );
      console.log(`   Source: ${doc.metadata.source || 'N/A'}`);
      console.log();
    });

    // Test search with filters
    console.log('=== Filtered Search Test ===');
    const filteredResults = await searcher.searchWithFilters(
      FILTERED_SEARCH_QUERY,
      FILTERED_SEARCH_FILTERS,
      TOP_K
    );
    filteredResults.forEach((doc, index) => {
      console.log(`${index + 1}. Score: ${doc.score.toFixed(3)}`);
      console.log(`   Title: ${doc.metadata.title || 'N/A'}`);
      console.log(`   Artist: ${doc.metadata.artist || 'N/A'}`);
      console.log(
        `   Text: ${
          doc.metadata.text
            ? doc.metadata.text.substring(0, 200) +
              (doc.metadata.text.length > 200 ? '...' : '')
            : 'N/A'
        }`
      );
      console.log(
        `   Accession Number: ${doc.metadata.accession_number || 'N/A'}`
      );
      console.log(`   Source: ${doc.metadata.source || 'N/A'}`);
      console.log();
    });
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Export the class for use in other modules
module.exports = { DocumentSearcher };

// Run test if this file is executed directly
if (require.main === module) {
  testSearch();
}
