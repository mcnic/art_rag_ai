const { Ollama } = require('@langchain/ollama');
require('dotenv').config();

class LLMIntegration {
  constructor(modelName = null) {
    const defaultModel = process.env.OLLAMA_MODEL || 'gemma2:2b';
    this.llm = new Ollama({
      model: modelName || defaultModel,
      temperature: 0.1, // Lower temperature for more consistent answers
      timeout: 30000, // 30 seconds timeout
    });

    this.promptTemplate = this.createPromptTemplate();
  }

  /**
   * Create a prompt template for RAG answers
   * @returns {string} The prompt template
   */
  createPromptTemplate() {
    return `You are an expert art historian and curator assistant. You have access to the Minneapolis Institute of Art collection database.

Based on the following context from the art collection, please answer the user's question. 

IMPORTANT GUIDELINES:
- Only use information provided in the context
- If the context doesn't contain enough information to answer the question, say "I don't have enough information to answer this question based on the available context."
- Be specific and accurate in your responses
- Cite specific artworks, artists, or details from the context when relevant
- If asked about artworks, include relevant details like title, artist, medium, period, and accession number when available

CONTEXT:
{context}

USER QUESTION: {question}

Please provide a comprehensive answer based on the context above:`;
  }

  /**
   * Generate a prompt with context and question
   * @param {string} context - Retrieved documents context
   * @param {string} question - User's question
   * @returns {string} Formatted prompt
   */
  formatPrompt(context, question) {
    return this.promptTemplate
      .replace('{context}', context)
      .replace('{question}', question);
  }

  /**
   * Generate answer using LLM
   * @param {string} context - Retrieved documents context
   * @param {string} question - User's question
   * @returns {Promise<Object>} Generated answer with metadata
   */
  async generateAnswer(context, question) {
    try {
      console.log('Generating answer with LLM...');

      const prompt = this.formatPrompt(context, question);

      const startTime = Date.now();
      const response = await this.llm.invoke(prompt);
      const endTime = Date.now();

      return {
        answer: response.trim(),
        processingTime: endTime - startTime,
        model: this.llm.model,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error generating answer:', error);
      throw new Error(`LLM generation failed: ${error.message}`);
    }
  }

  /**
   * Format context from retrieved documents
   * @param {Array} documents - Retrieved documents
   * @returns {string} Formatted context string
   */
  formatContext(documents) {
    if (!documents || documents.length === 0) {
      return 'No relevant documents found.';
    }

    return documents
      .map((doc, index) => {
        const metadata = doc.metadata;
        return `Document ${index + 1}:
- Title: ${metadata.title || 'Unknown'}
- Artist: ${metadata.artist || 'Unknown'}
- Accession Number: ${metadata.accession_number || 'Unknown'}
- Medium: ${metadata.medium || 'Unknown'}
- Period: ${metadata.period || 'Unknown'}
- Content: ${metadata.text || metadata.content || 'No content available'}
---`;
      })
      .join('\n\n');
  }

  /**
   * Test LLM connection and basic functionality
   * @returns {Promise<boolean>} Success status
   */
  async testConnection() {
    try {
      console.log('Testing LLM connection...');
      const testResponse = await this.llm.invoke(
        'Say "Hello, I am working correctly!"'
      );
      console.log('LLM Test Response:', testResponse);
      return true;
    } catch (error) {
      console.error('LLM connection test failed:', error);
      return false;
    }
  }
}

module.exports = { LLMIntegration };
