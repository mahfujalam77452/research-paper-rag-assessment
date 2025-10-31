const express = require('express');
const router = express.Router();
const paperController = require('../controllers/paperController');
const upload = require('../middlewares/uploadMiddleware');

/**
 * @route   POST /api/papers/upload
 * @desc    Upload and process a research paper
 * @access  Public
 */
router.post('/upload', upload.single('file'), paperController.uploadPaper);

/**
 * @route   GET /api/papers
 * @desc    List all papers with pagination
 * @access  Public
 * @query   page, limit, status
 */
router.get('/', paperController.listPapers);

/**
 * @route   GET /api/papers/:id
 * @desc    Get paper details by ID
 * @access  Public
 */
router.get('/:id', paperController.getPaper);

/**
 * @route   DELETE /api/papers/:id
 * @desc    Delete paper and its vectors
 * @access  Public
 */
router.delete('/:id', paperController.deletePaper);

/**
 * @route   GET /api/papers/:id/stats
 * @desc    Get paper statistics
 * @access  Public
 */
router.get('/:id/stats', paperController.getPaperStats);

module.exports = router;