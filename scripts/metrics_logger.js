const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class MetricsLogger {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.logDir = options.logDir || './logs';
    this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024; // 10MB
    this.retentionDays = options.retentionDays || 30;

    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0,
      errors: 0,
      questionsByHour: {},
      topQuestions: {},
      documentRetrievalStats: {
        averageDocumentsFound: 0,
        averageScore: 0,
        totalDocumentsRetrieved: 0,
      },
      llmStats: {
        averageGenerationTime: 0,
        totalGenerationTime: 0,
        generations: 0,
      },
    };

    this.ensureLogDirectory();
  }

  /**
   * Ensure log directory exists
   */
  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.warn('Could not create log directory:', error.message);
    }
  }

  /**
   * Log a RAG request
   * @param {Object} requestData - Request information
   * @param {Object} responseData - Response information
   * @param {Object} timingData - Timing information
   * @param {boolean} fromCache - Whether response came from cache
   */
  async logRAGRequest(
    requestData,
    responseData,
    timingData,
    fromCache = false
  ) {
    if (!this.enabled) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'rag_request',
      request: {
        question: requestData.question,
        topK: requestData.topK,
        scoreThreshold: requestData.scoreThreshold,
        filters: requestData.filters,
      },
      response: {
        answerLength: responseData.answer?.length || 0,
        sourcesCount: responseData.sources?.length || 0,
        averageScore:
          responseData.sources?.reduce((sum, s) => sum + s.score, 0) /
            (responseData.sources?.length || 1) || 0,
      },
      timing: {
        totalTime: timingData.totalProcessingTime,
        searchTime: timingData.searchTime,
        generationTime: timingData.generationTime,
        cacheTime: timingData.cacheTime || 0,
      },
      cache: {
        hit: fromCache,
        key: requestData.cacheKey,
      },
      metadata: {
        pipelineId: responseData.metadata?.pipelineId,
        model: responseData.metadata?.model,
        documentsFound: responseData.metadata?.documentsFound,
      },
    };

    // Update metrics
    this.updateMetrics(logEntry);

    // Write to log file
    await this.writeLog('rag_requests.log', logEntry);
  }

  /**
   * Log a search request
   * @param {Object} requestData - Request information
   * @param {Object} responseData - Response information
   * @param {Object} timingData - Timing information
   */
  async logSearchRequest(requestData, responseData, timingData) {
    if (!this.enabled) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'search_request',
      request: {
        query: requestData.question,
        filters: requestData.filters,
      },
      response: {
        documentsFound: responseData.documents?.length || 0,
        averageScore:
          responseData.documents?.reduce((sum, d) => sum + d.score, 0) /
            (responseData.documents?.length || 1) || 0,
      },
      timing: {
        totalTime: timingData.totalTime,
      },
    };

    await this.writeLog('search_requests.log', logEntry);
  }

  /**
   * Log an error
   * @param {string} type - Error type
   * @param {string} message - Error message
   * @param {Object} context - Error context
   * @param {Error} error - Error object
   */
  async logError(type, message, context = {}, error = null) {
    if (!this.enabled) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'error',
      errorType: type,
      message,
      context,
      stack: error?.stack,
    };

    this.metrics.errors++;

    await this.writeLog('errors.log', logEntry);
  }

  /**
   * Log system performance metrics
   * @param {Object} systemData - System information
   */
  async logSystemMetrics(systemData) {
    if (!this.enabled) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'system_metrics',
      metrics: this.metrics,
      system: systemData,
    };

    await this.writeLog('system_metrics.log', logEntry);
  }

  /**
   * Update in-memory metrics
   * @param {Object} logEntry - Log entry
   */
  updateMetrics(logEntry) {
    this.metrics.totalRequests++;

    // Cache metrics
    if (logEntry.cache?.hit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }

    // Timing metrics
    const totalTime = logEntry.timing.totalTime;
    this.metrics.totalProcessingTime += totalTime;
    this.metrics.averageProcessingTime =
      this.metrics.totalProcessingTime / this.metrics.totalRequests;

    // Question frequency
    const question = logEntry.request.question.toLowerCase();
    this.metrics.topQuestions[question] =
      (this.metrics.topQuestions[question] || 0) + 1;

    // Hourly distribution
    const hour = new Date(logEntry.timestamp).getHours();
    this.metrics.questionsByHour[hour] =
      (this.metrics.questionsByHour[hour] || 0) + 1;

    // Document retrieval metrics
    const docsFound = logEntry.response.sourcesCount;
    const avgScore = logEntry.response.averageScore;

    this.metrics.documentRetrievalStats.totalDocumentsRetrieved += docsFound;
    this.metrics.documentRetrievalStats.averageDocumentsFound =
      this.metrics.documentRetrievalStats.totalDocumentsRetrieved /
      this.metrics.totalRequests;

    // Update average score (simplified calculation)
    const currentTotal =
      this.metrics.documentRetrievalStats.averageScore *
      (this.metrics.totalRequests - 1);
    this.metrics.documentRetrievalStats.averageScore =
      (currentTotal + avgScore) / this.metrics.totalRequests;

    // LLM metrics
    const genTime = logEntry.timing.generationTime;
    if (genTime > 0) {
      this.metrics.llmStats.generations++;
      this.metrics.llmStats.totalGenerationTime += genTime;
      this.metrics.llmStats.averageGenerationTime =
        this.metrics.llmStats.totalGenerationTime /
        this.metrics.llmStats.generations;
    }
  }

  /**
   * Write log entry to file
   * @param {string} filename - Log filename
   * @param {Object} logEntry - Log entry
   */
  async writeLog(filename, logEntry) {
    try {
      const logPath = path.join(this.logDir, filename);
      const logLine = JSON.stringify(logEntry) + '\n';

      await fs.appendFile(logPath, logLine);

      // Check file size and rotate if needed
      await this.rotateLogFile(logPath);
    } catch (error) {
      console.warn('Failed to write log:', error.message);
    }
  }

  /**
   * Rotate log file if it's too large
   * @param {string} logPath - Log file path
   */
  async rotateLogFile(logPath) {
    try {
      const stats = await fs.stat(logPath);
      if (stats.size > this.maxLogSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const newPath = `${logPath}.${timestamp}`;
        await fs.rename(logPath, newPath);
      }
    } catch (error) {
      // File doesn't exist or other error, ignore
    }
  }

  /**
   * Get current metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheHitRate:
        this.metrics.cacheHits /
          (this.metrics.cacheHits + this.metrics.cacheMisses) || 0,
      errorRate: this.metrics.errors / this.metrics.totalRequests || 0,
    };
  }

  /**
   * Get top questions
   * @param {number} limit - Number of top questions to return
   * @returns {Array} Top questions
   */
  getTopQuestions(limit = 10) {
    return Object.entries(this.metrics.topQuestions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([question, count]) => ({ question, count }));
  }

  /**
   * Get hourly distribution
   * @returns {Object} Hourly distribution
   */
  getHourlyDistribution() {
    return this.metrics.questionsByHour;
  }

  /**
   * Clear old log files
   * @returns {Promise<number>} Number of files deleted
   */
  async clearOldLogs() {
    try {
      const files = await fs.readdir(this.logDir);
      const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoff) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.warn('Failed to clear old logs:', error.message);
      return 0;
    }
  }

  /**
   * Export metrics to JSON
   * @param {string} filename - Export filename
   */
  async exportMetrics(filename = null) {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      topQuestions: this.getTopQuestions(),
      hourlyDistribution: this.getHourlyDistribution(),
    };

    if (filename) {
      const exportPath = path.join(this.logDir, filename);
      await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    }

    return exportData;
  }
}

module.exports = { MetricsLogger };
