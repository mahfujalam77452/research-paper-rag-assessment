const fs = require('fs').promises;
const pdfProcessor = require('../../services/pdfProcessor');
const chunkingService = require('../../services/chunkingService');
const embeddingService = require('../../services/embeddingService');
const qdrantService = require('../../services/qdrantClient');
const Paper = require('../../models/Paper');
const logger = require('../../utils/logger');

class PaperController {
  /**
   * Upload and process a research paper
   * POST /api/papers/upload
   */
  async uploadPaper(req, res) {
    const startTime = Date.now();
    let paperId = null;

    try {
      // 1. Validate file
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      logger.info(`📤 Processing upload: ${req.file.originalname}`);

      const filePath = req.file.path;

      // 2. Validate PDF
      const validation = await pdfProcessor.validatePDF(filePath);
      if (!validation.valid) {
        await fs.unlink(filePath);
        return res.status(400).json({
          success: false,
          error: 'Invalid PDF file',
          details: validation.error
        });
      }

      // 3. Extract text and metadata using Gemini
      logger.info('📄 Extracting text and metadata...');
      const extracted = await pdfProcessor.extractFromPDF(filePath);

      // 4. Create chunks
      logger.info('✂️ Creating semantic chunks...');
      const chunks = chunkingService.createChunks(
        extracted.fullText,
        extracted.sections,
        'temp-id'
      );

      // 5. Generate embeddings
      logger.info('🔢 Generating embeddings...');
      const chunksWithEmbeddings = await embeddingService.generateChunkEmbeddings(chunks);
      // console.log(chunksWithEmbeddings);
      // 6. Save paper to MongoDB
      logger.info('💾 Saving to MongoDB...');
      const paper = new Paper({
        title: extracted.title,
        authors: extracted.authors,
        year: extracted.year,
        abstract: extracted.abstract,
        fileName: req.file.originalname,
        filePath: filePath,
        fileSize: req.file.size,
        totalPages: extracted.totalPages,
        sections: extracted.sections,
        chunks: chunks.map(chunk => ({
          chunkId: `${chunk.paperId}_${chunk.chunkIndex}`,
          text: chunk.text,
          section: chunk.section,
          page: chunk.page,
          startChar: 0,
          endChar: chunk.text.length
        })),
        stats: {
          totalChunks: chunks.length,
          totalQueries: 0
        },
        processingStatus: 'processing'
      });

      await paper.save();
      paperId = paper._id.toString();

      // 7. Prepare vectors for Qdrant
      //  const { v4: uuidv4 } = require('uuid');

function generateUniqueId(prefix = '') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return parseInt(`${timestamp}${random}`.slice(-12)); // 12-digit integer
}

const qdrantPoints = chunksWithEmbeddings.map((chunk, idx) => ({
  id: generateUniqueId(paperId),
  vector: chunk.embedding,
  payload: {
    paper_id: paperId,
    title: extracted.title,
    authors: extracted.authors,
    year: extracted.year,
    section: chunk.section,
    page: chunk.page,
    chunk_index: idx,
    text: chunk.text,
    original_id: `${paperId}_${idx}`
  }
}));
      // 8. Store vectors in Qdrant
      logger.info('🗄️ Storing vectors in Qdrant...');
      await qdrantService.upsertVectors(qdrantPoints);

      // 9. Update paper with Qdrant IDs
      paper.qdrantPointsIds = qdrantPoints.map(p => p.id);
      paper.processingStatus = 'completed';
      await paper.save();

      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

      logger.info(`✅ Paper processed successfully: ${paper.title} (${processingTime}s)`);

      // 10. Return response
      res.status(201).json({
        success: true,
        message: 'Paper uploaded and processed successfully',
        data: {
          paperId: paper._id,
          title: paper.title,
          authors: paper.authors,
          year: paper.year,
          abstract: paper.abstract,
          totalPages: paper.totalPages,
          totalChunks: chunks.length,
          sectionsFound: extracted.sections.length,
          processingTime: `${processingTime}s`
        }
      });

    } catch (error) {
      logger.error(`❌ Error processing paper: ${error.message}`);

      // Update paper status if it was created
      if (paperId) {
        try {
          await Paper.findByIdAndUpdate(paperId, {
            processingStatus: 'failed',
            processingError: error.message
          });
        } catch (updateError) {
          logger.error('Error updating paper status:', updateError);
        }
      }

      // Clean up file if it exists
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          logger.error('Error deleting file:', unlinkError);
        }
      }

      res.status(500).json({
        success: false,
        error: 'Failed to process paper',
        details: error.message
      });
    }
  }

  /**
   * List all papers with pagination
   * GET /api/papers
   */
  async listPapers(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;

      const query = {};
      if (status) {
        query.processingStatus = status;
      }

      const papers = await Paper.find(query)
        .select('-chunks -fullText')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      const count = await Paper.countDocuments(query);

      res.json({
        success: true,
        data: {
          papers,
          totalPages: Math.ceil(count / limit),
          currentPage: parseInt(page),
          totalPapers: count
        }
      });

    } catch (error) {
      logger.error('Error fetching papers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch papers',
        details: error.message
      });
    }
  }

  /**
   * Get paper details by ID
   * GET /api/papers/:id
   */
  async getPaper(req, res) {
    try {
      const paper = await Paper.findById(req.params.id);

      if (!paper) {
        return res.status(404).json({
          success: false,
          error: 'Paper not found'
        });
      }

      res.json({
        success: true,
        data: paper
      });

    } catch (error) {
      logger.error('Error fetching paper:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch paper',
        details: error.message
      });
    }
  }

  /**
   * Delete paper and its vectors
   * DELETE /api/papers/:id
   */
  async deletePaper(req, res) {
    try {
      const paper = await Paper.findById(req.params.id);

      if (!paper) {
        return res.status(404).json({
          success: false,
          error: 'Paper not found'
        });
      }

      // Delete vectors from Qdrant
      if (paper.qdrantPointsIds && paper.qdrantPointsIds.length > 0) {
        await qdrantService.deletePoints(paper.qdrantPointsIds);
      }

      // Delete file
      try {
        await fs.unlink(paper.filePath);
      } catch (fileError) {
        logger.warn('Could not delete file:', fileError.message);
      }

      // Delete from MongoDB
      await Paper.findByIdAndDelete(req.params.id);

      logger.info(`🗑️ Deleted paper: ${paper.title}`);

      res.json({
        success: true,
        message: 'Paper deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting paper:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete paper',
        details: error.message
      });
    }
  }

  /**
   * Get paper statistics
   * GET /api/papers/:id/stats
   */
  async getPaperStats(req, res) {
    try {
      const paper = await Paper.findById(req.params.id);

      if (!paper) {
        return res.status(404).json({
          success: false,
          error: 'Paper not found'
        });
      }

      res.json({
        success: true,
        data: {
          title: paper.title,
          totalChunks: paper.stats.totalChunks,
          totalQueries: paper.stats.totalQueries,
          lastQueried: paper.stats.lastQueried,
          sectionsCount: paper.sections.length,
          sections: paper.sections.map(s => s.name)
        }
      });

    } catch (error) {
      logger.error('Error fetching stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch stats',
        details: error.message
      });
    }
  }
}

module.exports = new PaperController();