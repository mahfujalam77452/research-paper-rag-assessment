const { QdrantClient } = require('@qdrant/js-client-rest');
const config = require('../config/config');
const logger = require('../utils/logger');

class QdrantService {
  constructor() {
    this.client = new QdrantClient({
      url: config.qdrant.url
    });
    this.collectionName = config.qdrant.collectionName;
    this.vectorSize = config.embedding.dimension;
  }

  /**
   * Initialize Qdrant collection
   */
  async initializeCollection() {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        col => col.name === this.collectionName
      );

      if (exists) {
        logger.info(`✅ Qdrant collection '${this.collectionName}' already exists`);
        return true;
      }

      // Create collection
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: this.vectorSize,
          distance: 'Cosine'
        },
        optimizers_config: {
          default_segment_number: 2
        },
        replication_factor: 1
      });

      logger.info(`✅ Qdrant collection '${this.collectionName}' created successfully`);
      
      // Create payload index for filtering
      await this.createPayloadIndex();
      
      return true;
    } catch (error) {
      logger.error(`❌ Error initializing Qdrant collection: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create indexes on payload fields for faster filtering
   */
  async createPayloadIndex() {
    try {
      // Index for paper_id field
      await this.client.createPayloadIndex(this.collectionName, {
        field_name: 'paper_id',
        field_schema: 'keyword'//take the field_name as actual text not 
                               // partial matching.
      });

      // Index for section field
      await this.client.createPayloadIndex(this.collectionName, {
        field_name: 'section',
        field_schema: 'keyword'
      });

      logger.info('✅ Payload indexes created');
    } catch (error) {
      // Indexes might already exist, log but don't throw
      logger.warn(`Payload index creation: ${error.message}`);
    }
  }

  /**
   * Store vectors in Qdrant
   * @param {Array} points - Array of points with id, vector, and payload
   */
  async upsertVectors(points) {
   
    try {
      //await debugVectors(points);
     
      const result = await this.client.upsert(this.collectionName, {
        wait: true,
        points: points
      });

      logger.info(`✅ Upserted ${points.length} vectors to Qdrant`);
      return result;
    } catch (error) {
      logger.error(`❌ Error upserting vectors: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search for similar vectors
   * @param {Array} queryVector - Query embedding vector
   * @param {Number} limit - Number of results to return
   * @param {Object} filter - Optional filter conditions
   */
  async searchSimilar(queryVector, limit = 5, filter = null) {
    try {
      const searchParams = {
        vector: queryVector,
        limit: limit,
        with_payload: true,//Return the actual text content
        with_vector: false
      };

      if (filter) {
        searchParams.filter = filter;
      }

      const results = await this.client.search(this.collectionName, searchParams);
      
      logger.info(`✅ Found ${results.length} similar vectors`);
      return results;
    } catch (error) {
      logger.error(`❌ Error searching vectors: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search with filter by paper IDs
   * @param {Array} queryVector - Query embedding vector
   * @param {Array} paperIds - Array of paper IDs to filter by
   * @param {Number} limit - Number of results
   */
  async searchByPaperIds(queryVector, paperIds, limit = 5) {
    const filter = {
      must: [
        {
          key: 'paper_id',
          match: {
            any: paperIds
          }
        }
      ]
    };

    return this.searchSimilar(queryVector, limit, filter);
  }

  /**
   * Delete vectors by paper ID
   * @param {String} paperId - Paper ID to delete
   */
  async deleteByPaperId(paperId) {
    try {
      const result = await this.client.delete(this.collectionName, {
        wait: true,
        filter: {
          must: [
            {
              key: 'paper_id',
              match: {
                value: paperId
              }
            }
          ]
        }
      });

      logger.info(`✅ Deleted vectors for paper: ${paperId}`);
      return result;
    } catch (error) {
      logger.error(`❌ Error deleting vectors: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete specific points by IDs
   * @param {Array} pointIds - Array of point IDs to delete
   */
  async deletePoints(pointIds) {
    try {
      const result = await this.client.delete(this.collectionName, {
        wait: true,
        points: pointIds
      });

      logger.info(`✅ Deleted ${pointIds.length} points from Qdrant`);
      return result;
    } catch (error) {
      logger.error(`❌ Error deleting points: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo() {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return info;
    } catch (error) {
      logger.error(`❌ Error getting collection info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Count points in collection
   */
  async countPoints(filter = null) {
    try {
      const count = await this.client.count(this.collectionName, {
        filter: filter,
        exact: true
      });
      return count.count;
    } catch (error) {
      logger.error(`❌ Error counting points: ${error.message}`);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      logger.error(`❌ Qdrant health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete entire collection (use with caution!)
   */
  async deleteCollection() {
    try {
      await this.client.deleteCollection(this.collectionName);
      logger.info(`✅ Deleted collection: ${this.collectionName}`);
      return true;
    } catch (error) {
      logger.error(`❌ Error deleting collection: ${error.message}`);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new QdrantService();