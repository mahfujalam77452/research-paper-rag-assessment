const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  authors: [{
    type: String,
    trim: true
  }],
  year: {
    type: Number,
    min: 1900,
    max: new Date().getFullYear() + 1
  },
  abstract: {
    type: String,
    default: ''
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    default: 0
  },
  sections: [{
    name: {
      type: String,
      
    },
    startPage: Number,
    content: String
  }],
  // Metadata for vector chunks
  chunks: [{
    chunkId: String,
    text: String,
    section: String,
    page: Number,
    startChar: Number,
    endChar: Number
  }],
  // Statistics
  stats: {
    totalChunks: {
      type: Number,
      default: 0
    },
    totalQueries: {
      type: Number,
      default: 0
    },
    lastQueried: Date,
    avgRelevanceScore: Number
  },
  // Processing status
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingError: String,
  // Vector DB reference
  qdrantPointsIds: [{
    type: String
  }]
}, {
  timestamps: true
});

// Indexes for faster queries
paperSchema.index({ title: 'text', abstract: 'text' });
paperSchema.index({ year: 1 });
paperSchema.index({ processingStatus: 1 });
paperSchema.index({ createdAt: -1 });

// Instance method to increment query count
paperSchema.methods.incrementQueryCount = function() {
  this.stats.totalQueries += 1;
  this.stats.lastQueried = new Date();
  return this.save();
};

// Static method to get papers by year range
paperSchema.statics.findByYearRange = function(startYear, endYear) {
  return this.find({
    year: { $gte: startYear, $lte: endYear }
  }).sort({ year: -1 });
};

// Virtual for display name
paperSchema.virtual('displayName').get(function() {
  return `${this.title} (${this.year || 'N/A'})`;
});

// Ensure virtuals are included in JSON
paperSchema.set('toJSON', { virtuals: true });
paperSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Paper', paperSchema);