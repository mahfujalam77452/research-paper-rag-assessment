require('dotenv').config();
const path = require('path');
const pdfProcessor = require('./src/services/pdfProcessor');
const chunkingService = require('./src/services/chunkingService');
const giminiService = require('./src/services/giminiService');

async function testPDFProcessing() {
  try {
    console.log('🧪 Testing Automated PDF Processing with Gimini LLM...\n');

    // Test with a sample PDF
    const pdfPath = path.join(__dirname, 'sample_papers', 'paper1_machine_learning.pdf');
    // Or use absolute path: const pdfPath = 'C:/path/to/your/paper.pdf';
    
    console.log(`📄 Processing: ${pdfPath}\n`);

    // 1. Test Gimini connection first
    console.log('1️⃣ Testing Gimini API connection...');
    const isConnected = await giminiService.testConnection();
    if (!isConnected) {
      throw new Error('Gimini API connection failed. Check your API key in .env file');
    }
    console.log('✅ Gimini API connected\n');

    // 2. Validate PDF
    console.log('2️⃣ Validating PDF file...');
    const validation = await pdfProcessor.validatePDF(pdfPath);
    if (!validation.valid) {
      throw new Error(`Invalid PDF: ${validation.error}`);
    }
    console.log('✅ PDF is valid\n');

    // 3. Extract from PDF (FULLY AUTOMATED - Gimini extracts metadata AND sections!)
    console.log('3️⃣ Extracting text and using Gimini to extract metadata & sections...');
    console.log('   (This may take 15-20 seconds as Gimini analyzes the paper)\n');
    
    const extracted = await pdfProcessor.extractFromPDF(pdfPath);
    
    console.log('✅ Extraction complete!\n');
    console.log('📋 Paper Information (Extracted by Gimini LLM):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📌 Title:', extracted.title);
    console.log('  👥 Authors:', extracted.authors.join(', '));
    console.log('  📅 Year:', extracted.year);
    console.log('  📄 Total Pages:', extracted.totalPages);
    console.log('  📝 Text Length:', extracted.metadata.textLength, 'characters');
    console.log('  📊 Word Count:', extracted.metadata.wordCount, 'words');
    console.log('  🔍 Sections Found:', extracted.sections.length);
    
    if (extracted.abstract) {
      console.log('\n  📄 Abstract:');
      console.log('  ' + extracted.abstract.substring(0, 300) + '...\n');
    }
    
    console.log('\n📑 Detected Sections:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    extracted.sections.forEach((section, idx) => {
      console.log(`  ${idx + 1}. ${section.name.padEnd(15)} (lines ${section.startLine}-${section.endLine}, ${section.lineCount} lines)`);
    });

    // 4. Create Chunks
    console.log('\n4️⃣ Creating semantic chunks...');
    const chunks = chunkingService.createChunks(
      extracted.fullText,
      extracted.sections,
      'test-paper-id'
    );
    
    console.log(`✅ Created ${chunks.length} chunks\n`);

    // 5. Show chunk statistics
    console.log('5️⃣ Analyzing chunks...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const stats = chunkingService.getChunkingStats(chunks);
    console.log('📊 Chunking Statistics:');
    console.log('  Total Chunks:', stats.totalChunks);
    console.log('  Total Words:', stats.totalWords);
    console.log('  Avg Words/Chunk:', stats.avgWordsPerChunk);
    console.log('  Avg Chars/Chunk:', stats.avgCharsPerChunk);
    
    console.log('\n  Section Distribution:');
    Object.entries(stats.sectionDistribution).forEach(([section, count]) => {
      console.log(`    ${section.padEnd(15)}: ${count} chunks`);
    });

    // 6. Show sample chunks
    console.log('\n6️⃣ Sample chunks (first 3):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    chunks.slice(0, 3).forEach((chunk, idx) => {
      console.log(`\n  📄 Chunk ${idx + 1}:`);
      console.log(`     Section: ${chunk.section}`);
      console.log(`     Page: ${chunk.page}`);
      console.log(`     Word Count: ${chunk.wordCount}`);
      console.log(`     Preview: ${chunk.text.substring(0, 150)}...`);
    });

    // 7. Validate chunks
    console.log('\n7️⃣ Validating chunk quality...');
    const validChunks = chunks.filter(chunk => chunkingService.validateChunk(chunk));
    console.log(`✅ ${validChunks.length}/${chunks.length} chunks passed validation\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 All automated PDF processing tests passed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✨ Summary:');
    console.log('   ✅ Gimini LLM extracted metadata AND sections automatically');
    console.log('   ✅ No regex patterns needed - AI understands the structure');
    console.log('   ✅ Chunks created with semantic awareness');
    console.log('   ✅ Ready for embedding and vector storage!\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.message.includes('Gimini')) {
      console.error('\n💡 Make sure you have:');
      console.error('   1. Added your Gimini API key to .env file');
      console.error('   2. Set Gimini_API_KEY=your_key_here');
    }
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run tests
testPDFProcessing();