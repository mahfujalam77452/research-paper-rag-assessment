# 🎓 Research Paper RAG System

A production-ready Retrieval-Augmented Generation (RAG) system for querying academic research papers using Node.js, Express, MongoDB, Qdrant, and Gemini LLM.

## 🚀 Features

- ✅ **Automated PDF Processing** - Upload PDFs, extract text, metadata, and sections using Gemini LLM
- ✅ **Intelligent Chunking** - Semantic chunking with section awareness and overlap
- ✅ **Vector Search** - 384-dimensional embeddings with Qdrant vector database
- ✅ **RAG Query System** - Context-aware answers with citations and sources
- ✅ **Analytics Dashboard** - Query history, popular topics, and system metrics
- ✅ **RESTful API** - Clean MVC architecture with comprehensive endpoints

## 📋 Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Backend** | Node.js + Express | API server |
| **Database** | MongoDB | Metadata & query history |
| **Vector DB** | Qdrant | Similarity search |
| **LLM** | Gemini Pro | Metadata extraction & answers |
| **Embeddings** | Xenova/transformers | Text vectorization (local) |
| **PDF Processing** | pdf-parse | Text extraction |

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│        Express API Server            │
│  ┌────────────────────────────────┐  │
│  │    Routes (API Endpoints)      │  │
│  └────────────┬───────────────────┘  │
│               │                      │
│  ┌────────────▼───────────────────┐  │
│  │    Controllers (Logic)         │  │
│  └────────────┬───────────────────┘  │
│               │                      │
│  ┌────────────▼───────────────────┐  │
│  │    Services (Business Logic)   │  │
│  │  • PDF Processor               │  │
│  │  • Chunking Service            │  │
│  │  • Embedding Service           │  │
│  │  • Gemini Service              │  │
│  │  • Qdrant Client               │  │
│  └────────────┬───────────────────┘  │
└───────────────┼───────────────────────┘
                │
     ┌──────────┴──────────┐
     │                     │
┌────▼─────┐      ┌────────▼────────┐
│ MongoDB  │      │ Qdrant Vector DB│
│(Metadata)│      │  (Embeddings)   │
└──────────┘      └─────────────────┘
                          │
                  ┌───────▼────────┐
                  │  Gemini LLM    │
                  │  (Generation)  │
                  └────────────────┘
```

## 📁 Project Structure

```
research-paper-rag-assessment/
├── src/
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── paperController.js
│   │   │   ├── queryController.js
│   │   │   └── analyticsController.js
│   │   ├── routes/
│   │   │   ├── paperRoutes.js
│   │   │   ├── queryRoutes.js
│   │   │   └── analyticsRoutes.js
│   │   └── middlewares/
│   │       ├── uploadMiddleware.js
│   │       ├── errorHandler.js
│   │       └── validateRequest.js
│   ├── models/
│   │   ├── Paper.js
│   │   └── Query.js
│   ├── services/
│   │   ├── pdfProcessor.js
│   │   ├── chunkingService.js
│   │   ├── embeddingService.js
│   │   ├── qdrantClient.js
│   │   └── geminiService.js
│   ├── config/
│   │   ├── config.js
│   │   └── database.js
│   ├── utils/
│   │   └── logger.js
│   └── server.js
├── uploads/
├── logs/
├── .env
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── APPROACH.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- MongoDB (local or Atlas)
- Docker (for Qdrant)
- Gemini API key

### Installation

```bash
# 1. Clone repository
git clone <your-repo-url>
cd research-paper-rag-assessment

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and add your keys

# 4. Start MongoDB (if local)
# Or use MongoDB Atlas connection string

# 5. Start Qdrant
docker run -d --name qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant:latest

# 6. Start the server
npm run dev
```

### Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/research_papers_rag

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION_NAME=research_papers

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
GEMINI_MODEL=gemini-pro

# Embeddings
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384

# Chunking
CHUNK_SIZE=500
CHUNK_OVERLAP=50
TOP_K_RESULTS=5
```

## 📡 API Endpoints

### Papers API

#### Upload Paper
```bash
POST /api/papers/upload
Content-Type: multipart/form-data

file: <PDF file>
```

#### List Papers
```bash
GET /api/papers?page=1&limit=10&status=completed
```

#### Get Paper Details
```bash
GET /api/papers/:id
```

#### Delete Paper
```bash
DELETE /api/papers/:id
```

#### Get Paper Stats
```bash
GET /api/papers/:id/stats
```

### Query API

#### Query Papers
```bash
POST /api/query
Content-Type: application/json

{
  "question": "What is machine learning?",
  "top_k": 5,
  "paper_ids": ["optional"]
}
```

#### Get Query History
```bash
GET /api/query/history?page=1&limit=20
```

#### Get Popular Queries
```bash
GET /api/query/popular?limit=10
```

#### Rate Query
```bash
POST /api/query/:id/rating
Content-Type: application/json

{
  "rating": 5,
  "feedback": "Great answer!"
}
```

### Analytics API

#### System Analytics
```bash
GET /api/analytics
```

#### Query Statistics
```bash
GET /api/analytics/queries?period=7d
```

#### Paper Statistics
```bash
GET /api/analytics/papers
```

#### Popular Topics
```bash
GET /api/analytics/popular?limit=10
```

#### Satisfaction Metrics
```bash
GET /api/analytics/satisfaction?period=7d
```

## 🔄 Data Flow

### Document Ingestion

```
PDF Upload
    ↓
Validate PDF (10MB max)
    ↓
Extract Text (pdf-parse)
    ↓
Gemini: Extract Metadata & Sections
    ↓
Create Semantic Chunks (500 words, 50 overlap)
    ↓
Generate Embeddings (384-dim vectors)
    ↓
Store in MongoDB (metadata)
    ↓
Store in Qdrant (vectors)
    ↓
Return Success Response
```

### Query Processing

```
User Question
    ↓
Generate Query Embedding
    ↓
Search Qdrant (vector similarity)
    ↓
Retrieve Top K Contexts
    ↓
Build Prompt with Contexts
    ↓
Gemini: Generate Answer
    ↓
Prepare Citations
    ↓
Save Query to MongoDB
    ↓
Return Answer + Citations
```

## ⏱️ Performance

- **Paper Processing**: ~25-30 seconds per paper
- **5 Papers**: ~2 minutes ✅ (meets requirement)
- **Query Response**: ~3-5 seconds
- **Vector Search**: ~100-200ms
- **Embedding Generation**: ~50-100ms per chunk

## 🧪 Testing

```bash
# Test PDF processing
node test-pdf-processing.js

# Test embeddings
node test-embeddings.js

# Test Qdrant
node test-qdrant.js

# Test upload API
powershell -ExecutionPolicy Bypass -File test-upload-api.ps1

# Test query API
powershell -ExecutionPolicy Bypass -File test-query-api.ps1
```

## 📊 Example Usage

### Upload a Paper

```bash
curl -X POST http://localhost:3000/api/papers/upload \
  -F "file=@paper.pdf"
```

### Ask a Question

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What methodology was used?",
    "top_k": 5
  }'
```

### Get Analytics

```bash
curl http://localhost:3000/api/analytics
```

## 🎯 Key Features Explained

### Intelligent Chunking

- **Section-Aware**: Preserves document structure
- **Sentence-Based**: No mid-sentence cuts
- **Overlap**: 50-word overlap prevents context loss
- **Metadata**: Each chunk tracks section, page, position

### RAG System

- **Retrieval**: Vector similarity search in Qdrant
- **Augmentation**: Top-K relevant contexts added to prompt
- **Generation**: Gemini generates context-aware answers
- **Citations**: Automatic source attribution with pages

### Analytics

- **System Metrics**: Papers, queries, success rates
- **Query Stats**: Types, response times, trends
- **User Satisfaction**: Ratings, feedback analysis
- **Popular Topics**: Trending queries and keywords

## 🔒 Error Handling

- Comprehensive error middleware
- Validation on all inputs
- Graceful fallbacks
- Detailed error logging
- User-friendly error messages

## 📝 Logging

- Winston logger with multiple transports
- Console output (colorized)
- File logging (combined.log, error.log)
- Request logging with Morgan
- Timestamp and log levels

## 🚀 Deployment

### Docker Deployment (Recommended)

```bash
# Build image
docker build -t research-paper-rag .

# Run with docker-compose
docker-compose up -d
```

### Environment-Specific Configs

- Development: Full logging, debug mode
- Production: Optimized, secure, rate-limited







## 🙏 Acknowledgments

- Gemini API for LLM capabilities
- Qdrant team for vector database
- OpenAI for embedding models

---

**Built with ❤️ for the AI Research Community**
