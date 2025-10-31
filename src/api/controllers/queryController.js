const embeddingService = require('../../services/embeddingService');
const qdrantService = require('../../services/qdrantClient');
const geminiService = require('../../services/giminiService');
const Query = require('../../models/Query');
const Paper = require('../../models/Paper');
const logger = require('../../utils/logger');

class QueryController {
  
  
    /**
   * Query the research papers
   * POST /api/query
   * /**
   * Classify query type
   */
  
   
  async queryPapers(req, res) {
    /**
   * Classify query type - arrow function for auto-binding
   */
    const classifyQuery = (question, paperIds) => {
    if (!question || typeof question !== 'string') return 'general';
    
    const lowerQuestion = question.toLowerCase();

    if (paperIds && paperIds.length === 1) {
      return 'single-paper';
    } else if (paperIds && paperIds.length > 1) {
      return 'multi-paper';
    } else if (
      lowerQuestion.includes('compare') || 
      lowerQuestion.includes('difference') ||
      lowerQuestion.includes('versus') ||
      lowerQuestion.includes('vs')
    ) {
      return 'comparison';
    } else if (
      lowerQuestion.includes('method') ||
      lowerQuestion.includes('approach') ||
      lowerQuestion.includes('algorithm')
    ) {
      return 'methodology';
    } else if (
      lowerQuestion.includes('result') ||
      lowerQuestion.includes('performance') ||
      lowerQuestion.includes('accuracy')
    ) {
      return 'results';
    } else {
      return 'general';
    }
  };
    const startTime = Date.now();

    try {
      const { question, top_k = 5, paper_ids } = req.body;

      // Validate input
      if (!question || question.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Question is required'
        });
      }

      logger.info(`🔍 Processing query: "${question}"`);

      // 1. Generate query embedding
      const retrievalStart = Date.now();
      logger.info('🔢 Generating query embedding...');
      const queryEmbedding = await embeddingService.generateQueryEmbedding(question);

      // 2. Search in Qdrant
      logger.info('🗄️ Searching in Qdrant...');
      let searchResults;
      
      if (paper_ids && paper_ids.length > 0) {
        // Search within specific papers
        searchResults = await qdrantService.searchByPaperIds(
          queryEmbedding,
          paper_ids,
          top_k
        );
      } else {
        // Search across all papers
        searchResults = await qdrantService.searchSimilar(
          queryEmbedding,
          top_k
        );
      }

      const retrievalTime = Date.now() - retrievalStart;

      if (searchResults.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No relevant information found',
          message: 'Try rephrasing your question or upload more papers'
        });
      }

      logger.info(`✅ Found ${searchResults.length} relevant chunks`);

      // 3. Prepare contexts for LLM
      const contexts = searchResults.map(result => ({
        text: result.payload.text,
        paper_title: result.payload.title,
        paper_id: result.payload.paper_id,
        authors: result.payload.authors,
        year: result.payload.year,
        section: result.payload.section,
        page: result.payload.page,
        score: result.score
      }));

      // 4. Generate answer using Gemini
      const llmStart = Date.now();
      logger.info('🤖 Generating answer with Gemini...');
      const geminiResponse = await geminiService.generateAnswer(question, contexts);
      const llmTime = Date.now() - llmStart;

      // 5. Prepare citations
     
      const citations = searchResults.map((result, idx) => ({
        paperId: result.payload.paper_id,
        paperTitle: result.payload.title,
        authors: result.payload.authors,
        year: result.payload.year,
        section: result.payload.section,
        page: result.payload.page,
        relevanceScore: result.score,
        chunkText: result.payload.text.substring(0, 200) + '...'
      }));

      // 6. Get unique paper titles used
      const sourcesUsed = [...new Set(searchResults.map(r => r.payload.title))];

      // 7. Calculate confidence (average of top scores)
      const confidence = searchResults.length > 0
        ? searchResults.reduce((sum, r) => sum + r.score, 0) / searchResults.length
        : 0;
    
      // 8. Save query to database
      const queryRecord = new Query({
  question: (question || '').trim(),
  topK: top_k || 10, // Default fallback
  paperIds: Array.isArray(paper_ids) ? paper_ids : [],
  answer: geminiResponse?.answer || 'No answer generated',
  citations: Array.isArray(citations) ? citations : [],
  sourcesUsed: Array.isArray(sourcesUsed) ? sourcesUsed : [],
  confidence: typeof confidence === 'number' ? confidence : 0,
  metrics: {
    responseTime: Date.now() - (startTime || Date.now()),
    retrievalTime: retrievalTime || 0,
    llmTime: llmTime || 0,
    chunksRetrieved: Array.isArray(searchResults) ? searchResults.length : 0
  },
  queryType: classifyQuery(question, paper_ids) || 'general'
});
      console.log("queryRecord:", queryRecord);
      await queryRecord.save();
     
      // 9. Update paper query counts
      const uniquePaperIds = [...new Set(searchResults.map(r => r.payload.paper_id))];
      await Promise.all(
        uniquePaperIds.map(paperId => 
          Paper.findByIdAndUpdate(paperId, {
            $inc: { 'stats.totalQueries': 1 },
            'stats.lastQueried': new Date()
          })
        )
      );

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`✅ Query processed successfully in ${totalTime}s`);

      // 10. Return response
      res.json({
        success: true,
        data: {
          answer: geminiResponse.answer,
          citations: citations,
          sourcesUsed: sourcesUsed,
          confidence: parseFloat(confidence.toFixed(2)),
          metrics: {
            totalTime: `${totalTime}s`,
            retrievalTime: `${(retrievalTime / 1000).toFixed(2)}s`,
            llmTime: `${(llmTime / 1000).toFixed(2)}s`,
            chunksRetrieved: searchResults.length
          },
          queryId: queryRecord._id
        }
      });

    } catch (error) {
      logger.error(`❌ Error processing query : ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to process query',
        details: error.message
      });
    }
  }

  /**
   * Get query history
   * GET /api/query/history
   */
  async getQueryHistory(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const queries = await Query.find()
        .select('-citations.chunkText') // Exclude large text fields
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      const count = await Query.countDocuments();

      res.json({
        success: true,
        data: {
          queries,
          totalPages: Math.ceil(count / limit),
          currentPage: parseInt(page),
          totalQueries: count
        }
      });

    } catch (error) {
      logger.error('Error fetching query history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch query history',
        details: error.message
      });
    }
  }

  /**
   * Get popular queries
   * GET /api/query/popular
   */
  async getPopularQueries(req, res) {
    try {
      const { limit = 10 } = req.query;

      const popularQueries = await Query.getPopularQueries(parseInt(limit));

      res.json({
        success: true,
        data: {
          queries: popularQueries
        }
      });

    } catch (error) {
      logger.error('Error fetching popular queries:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch popular queries',
        details: error.message
      });
    }
  }

  /**
   * Add rating to a query
   * POST /api/query/:id/rating
   */
  async addRating(req, res) {
    try {
      const { rating, feedback } = req.body;
      const queryId = req.params.id;

      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: 'Rating must be between 1 and 5'
        });
      }

      const query = await Query.findById(queryId);

      if (!query) {
        return res.status(404).json({
          success: false,
          error: 'Query not found'
        });
      }

      await query.addRating(rating, feedback);

      logger.info(`⭐ Rating added: ${rating}/5 for query "${query.question}"`);

      res.json({
        success: true,
        message: 'Rating added successfully',
        data: {
          queryId: query._id,
          rating: query.userRating,
          feedback: query.userFeedback
        }
      });

    } catch (error) {
      logger.error('Error adding rating:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add rating',
        details: error.message
      });
    }
  }

  
}

module.exports = new QueryController();