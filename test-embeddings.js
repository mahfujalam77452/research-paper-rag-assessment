require('dotenv').config();
const embeddingService = require('./src/services/embeddingService');
const logger = require('./src/utils/logger');

async function testEmbeddings() {
  try {
    console.log('🧪 Testing Embedding Service...\n');

    // 1. Initialize the model
    console.log('1️⃣ Initializing embedding model...');
    console.log('   (First time may take 1-2 minutes to download model)\n');
    
    await embeddingService.initialize();
    
    const modelInfo = embeddingService.getModelInfo();
    console.log('✅ Model initialized');
    console.log('   Model:', modelInfo.name);
    console.log('   Dimension:', modelInfo.dimension);
    console.log('   Status:', modelInfo.initialized ? 'Ready' : 'Not Ready');
    console.log();

    // 2. Test single embedding
    console.log('2️⃣ Generating single embedding...');
    const testText = 'Machine learning is a subset of artificial intelligence that focuses on training algorithms to learn from data.';
    
    const startTime = Date.now();
    const embedding = await embeddingService.generateEmbedding(testText);
    const duration = Date.now() - startTime;
    
    console.log('✅ Embedding generated');
    console.log('   Text length:', testText.length, 'characters');
    console.log('   Embedding dimension:', embedding.length);
    console.log('   Time taken:', duration, 'ms');
    console.log('   First 5 values:', embedding.slice(0, 5).map(v => v.toFixed(4)));
    console.log();

    // 3. Test batch embeddings
    console.log('3️⃣ Generating batch embeddings...');
    const testTexts = [
      'Neural networks are computing systems inspired by biological neural networks.',
      'Deep learning uses multiple layers to progressively extract higher-level features.',
      'Natural language processing enables computers to understand human language.',
      'Computer vision allows machines to interpret and understand visual information.',
      'Reinforcement learning trains agents through rewards and punishments.'
    ];
    
    const batchStartTime = Date.now();
    const embeddings = await embeddingService.generateEmbeddings(testTexts, (current, total) => {
      console.log(`   Progress: ${current}/${total} embeddings`);
    });
    const batchDuration = Date.now() - batchStartTime;
    
    console.log('✅ Batch embeddings generated');
    console.log('   Total texts:', testTexts.length);
    console.log('   Total embeddings:', embeddings.length);
    console.log('   Time taken:', batchDuration, 'ms');
    console.log('   Avg time per embedding:', (batchDuration / embeddings.length).toFixed(2), 'ms');
    console.log();

    // 4. Test chunk embeddings
    console.log('4️⃣ Generating chunk embeddings...');
    const testChunks = [
      {
        text: 'The transformer architecture has revolutionized natural language processing.',
        section: 'Introduction',
        page: 1,
        chunkIndex: 0
      },
      {
        text: 'Attention mechanisms allow the model to focus on relevant parts of the input.',
        section: 'Methodology',
        page: 3,
        chunkIndex: 1
      },
      {
        text: 'Our experiments show significant improvements over previous baselines.',
        section: 'Results',
        page: 5,
        chunkIndex: 2
      }
    ];
    
    const chunksWithEmbeddings = await embeddingService.generateChunkEmbeddings(testChunks);
    
    console.log('✅ Chunk embeddings generated');
    console.log('   Total chunks:', chunksWithEmbeddings.length);
    chunksWithEmbeddings.forEach((chunk, idx) => {
      console.log(`   Chunk ${idx + 1}:`);
      console.log(`     Section: ${chunk.section}`);
      console.log(`     Page: ${chunk.page}`);
      console.log(`     Embedding: [${chunk.embedding.length} dimensions]`);
    });
    console.log();

    // 5. Test query embedding
    console.log('5️⃣ Generating query embedding...');
    const query = 'What is the transformer architecture?';
    
    const queryEmbedding = await embeddingService.generateQueryEmbedding(query);
    
    console.log('✅ Query embedding generated');
    console.log('   Query:', query);
    console.log('   Embedding dimension:', queryEmbedding.length);
    console.log();

    // 6. Calculate similarity
    console.log('6️⃣ Testing similarity calculation...');
    
    function cosineSimilarity(vec1, vec2) {
      const dotProduct = vec1.reduce((sum, val, idx) => sum + val * vec2[idx], 0);
      const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
      const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
      return dotProduct / (mag1 * mag2);
    }
    
    const similarities = chunksWithEmbeddings.map(chunk => ({
      text: chunk.text.substring(0, 60) + '...',
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    console.log('Most similar chunks to query:', `"${query}"`);
    similarities.forEach((item, idx) => {
      console.log(`   ${idx + 1}. Similarity: ${item.similarity.toFixed(4)}`);
      console.log(`      Text: ${item.text}`);
    });
    console.log();

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 All embedding tests passed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✨ Summary:');
    console.log('   ✅ Model initialized and ready');
    console.log('   ✅ Single embedding generation working');
    console.log('   ✅ Batch embedding generation working');
    console.log('   ✅ Chunk embedding generation working');
    console.log('   ✅ Query embedding generation working');
    console.log('   ✅ Similarity calculation working');
    console.log('   ✅ Ready to integrate with Qdrant!\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testEmbeddings();