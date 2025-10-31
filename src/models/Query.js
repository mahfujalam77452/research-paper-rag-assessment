const mongoose = require('mongoose');

const querySchema = new mongoose.Schema({
  // Query text
  question: {
    type: String,
    required: true,
    trim: true
  },
  
  // Query parameters
  topK: {
    type: Number,
    default: 5
  },
  
  paperIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper'
  }],
  
  // Response data
  answer: {
    type: String,
    required: true
  },
  
  citations: [{
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paper'
    },
    paperTitle: String,
    section: String,
    page: Number,
    relevanceScore: Number,
    chunkText: String
  }],
  
  sourcesUsed: [{
    type: String
  }],
  
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  
  // Performance metrics
  metrics: {
    responseTime: {
      type: Number, // in milliseconds
      required: true
    },
    retrievalTime: Number,
    llmTime: Number,
    chunksRetrieved: Number
  },
  
  // User feedback
  userRating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  userFeedback: String,
  
  // Query classification
  queryType: {
    type: String,
    enum: ['single-paper', 'multi-paper', 'comparison', 'general', 'methodology', 'results'],
    default: 'general'
  },
  
  // Session tracking
  sessionId: String,
  ipAddress: String,
  userAgent: String
  
}, {
  timestamps: true
});

// Indexes for analytics
querySchema.index({ createdAt: -1 });
querySchema.index({ question: 'text' });
querySchema.index({ queryType: 1 });
querySchema.index({ 'metrics.responseTime': 1 });
querySchema.index({ userRating: 1 });

// Static method to get popular queries
querySchema.statics.getPopularQueries = function(limit = 10) {
  return this.aggregate([
    {
      $group: {
        _id: '$question',
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$metrics.responseTime' },
        avgRating: { $avg: '$userRating' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
};

// Static method to get query analytics
querySchema.statics.getAnalytics = function(startDate, endDate) {
  const match = {};
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalQueries: { $sum: 1 },
        avgResponseTime: { $avg: '$metrics.responseTime' },
        avgConfidence: { $avg: '$confidence' },
        avgRating: { $avg: '$userRating' },
        queryTypes: { $push: '$queryType' }
      }
    }
  ]);
};

// Instance method to add user rating
querySchema.methods.addRating = function(rating, feedback) {
  this.userRating = rating;
  if (feedback) this.userFeedback = feedback;
  return this.save();
};

module.exports = mongoose.model('Query', querySchema);