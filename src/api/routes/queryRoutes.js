const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const queryController = require('../controllers/queryController');
const validateRequest = require('../middlewares/validateRequest');

/**
 * @route   POST /api/query
 * @desc    Query the research papers
 * @access  Public
 */
router.post(
  '/',
  [
    body('question')
      .trim()
      .notEmpty()
      .withMessage('Question is required')
      .isLength({ min: 3, max: 500 })
      .withMessage('Question must be between 3 and 500 characters'),
    body('top_k')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('top_k must be between 1 and 20'),
    body('paper_ids')
      .optional()
      .isArray()
      .withMessage('paper_ids must be an array')
  ],
  validateRequest,
  queryController.queryPapers
);

/**
 * @route   GET /api/query/history
 * @desc    Get query history with pagination
 * @access  Public
 */
router.get('/history', queryController.getQueryHistory);

/**
 * @route   GET /api/query/popular
 * @desc    Get popular queries
 * @access  Public
 */
router.get('/popular', queryController.getPopularQueries);

/**
 * @route   POST /api/query/:id/rating
 * @desc    Add rating to a query
 * @access  Public
 */
router.post(
  '/:id/rating',
  [
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('feedback')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Feedback must be less than 500 characters')
  ],
  validateRequest,
  queryController.addRating
);

module.exports = router;