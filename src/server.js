require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./utils/logger');
const { connectDB } = require('./config/database');
const qdrantService = require('./services/qdrantClient');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize databases
async function initializeDatabases() {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Initialize Qdrant collection
    await qdrantService.initializeCollection();
    
    logger.info('✅ All databases initialized successfully');
  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabases();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Research Paper RAG System API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      papers: '/api/papers',
      query: '/api/query',
      analytics: '/api/analytics'
    }
  });
});

// Routes
app.use('/api/papers', require('./api/routes/paperRoutes'));
app.use('/api/query', require('./api/routes/queryRoutes'));
// app.use('/api/analytics', require('./api/routes/analyticsRoutes'));

// Error handling middleware
const { errorHandler, notFound } = require('./api/middlewares/errorHandler');

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;