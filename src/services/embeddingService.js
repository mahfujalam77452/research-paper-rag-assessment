const logger = require('../utils/logger');
const config = require('../config/config');

class EmbeddingService {
  constructor() {
    this.model = null;
    this.modelName = config.embedding.model;
    this.dimension = config.embedding.dimension;
    this.isInitialized = false;
    this.pipeline = null; // Will hold the pipeline function
  }

  /**
   * Initialize the embedding model (lazy loading)
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info(`🔄 Loading embedding model: ${this.modelName}...`);
      
      // Dynamic import for ESM package
      if (!this.pipeline) {
        const { pipeline } = await import('@xenova/transformers');
        this.pipeline = pipeline;
      }
      
      // Load the sentence-transformers model
      this.model = await this.pipeline('feature-extraction', this.modelName);
      
      this.isInitialized = true;
      logger.info(`✅ Embedding model loaded successfully`);
    } catch (error) {
      logger.error(`❌ Failed to load embedding model: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate embedding for a single text
   * @param {String} text - Text to embed
   * @returns {Array} Embedding vector (384 dimensions)
   */
  async generateEmbedding(text) {
    try {
      // Initialize model if not already done
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Clean and truncate text if too long
      const cleanText = text.trim().substring(0, 5000);

      if (cleanText.length === 0) {
        throw new Error('Text is empty after cleaning');
      }

      // Generate embedding
      const output = await this.model(cleanText, {
        pooling: 'mean',
        normalize: true
      });

      // Convert to array
      const embedding = Array.from(output.data);

      return embedding;

    } catch (error) {
      logger.error(`❌ Error generating embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   * @param {Array} texts - Array of texts to embed
   * @param {Function} progressCallback - Optional callback for progress updates
   * @returns {Array} Array of embedding vectors
   */
  async generateEmbeddings(texts, progressCallback = null) {
    try {
      // Initialize model if not already done
      if (!this.isInitialized) {
        await this.initialize();
      }

      logger.info(`🔄 Generating embeddings for ${texts.length} texts...`);
      
      const embeddings = [];
      const batchSize = 10; // Process 10 at a time
      
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        // Process batch
        const batchPromises = batch.map(text => this.generateEmbedding(text));
        const batchEmbeddings = await Promise.all(batchPromises);
        
        embeddings.push(...batchEmbeddings);
        
        // Progress callback
        if (progressCallback) {
          progressCallback(Math.min(i + batchSize, texts.length), texts.length);
        }
        
        logger.info(`   Progress: ${Math.min(i + batchSize, texts.length)}/${texts.length} embeddings generated`);
      }

      logger.info(`✅ Generated ${embeddings.length} embeddings`);
      return embeddings;

    } catch (error) {
      logger.error(`❌ Error generating embeddings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate embeddings for chunks with metadata
   * @param {Array} chunks - Array of chunk objects
   * @returns {Array} Array of objects with chunk data and embeddings
   */
  async generateChunkEmbeddings(chunks) {
    try {
      logger.info(`🔄 Generating embeddings for ${chunks.length} chunks...`);
      
      // Extract texts from chunks
      const texts = chunks.map(chunk => chunk.text);
      
      // Generate embeddings
      const embeddings = await this.generateEmbeddings(texts);
      
      // Combine chunks with their embeddings
      const chunksWithEmbeddings = chunks.map((chunk, idx) => ({
        ...chunk,
        embedding: embeddings[idx]
      }));

      logger.info(`✅ Generated embeddings for all chunks`);
      return chunksWithEmbeddings;

    } catch (error) {
      logger.error(`❌ Error generating chunk embeddings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate embedding for a query
   * @param {String} query - Query text
   * @returns {Array} Query embedding vector
   */
  async generateQueryEmbedding(query) {
    try {
      logger.info(`🔍 Generating query embedding...`);
      
      const embedding = await this.generateEmbedding(query);
      
      logger.info(`✅ Query embedding generated`);
      return embedding;

    } catch (error) {
      logger.error(`❌ Error generating query embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get embedding dimension
   */
  getDimension() {
    return this.dimension;
  }

  /**
   * Check if model is initialized
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Get model info
   */
  getModelInfo() {
    return {
      name: this.modelName,
      dimension: this.dimension,
      initialized: this.isInitialized
    };
  }
}

module.exports = new EmbeddingService();