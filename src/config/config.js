module.exports = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },
  
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/research_papers_rag'
  },
  
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    collectionName: process.env.QDRANT_COLLECTION_NAME || 'research_papers'
  },
  
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  },
  gimini: {
    apiKey: process.env.GEMINI_API_KEY,
    apiUrl: process.env.GEMINI_API_URL 
   
  },
  
  embedding: {
    model: process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2',
    dimension: parseInt(process.env.EMBEDDING_DIMENSION) || 384
  },
  
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    allowedTypes: ['application/pdf']
  },
  
  chunking: {
    chunkSize: parseInt(process.env.CHUNK_SIZE) || 500,
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP) || 50
  },
  
  rag: {
    topK: parseInt(process.env.TOP_K_RESULTS) || 5
  }
};