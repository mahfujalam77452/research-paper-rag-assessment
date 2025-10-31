require('dotenv').config();
const qdrantService = require('./src/services/qdrantClient');
const logger = require('./src/utils/logger');

async function testQdrant() {
  try {
    console.log('🧪 Testing Qdrant Connection...\n');

    // 1. Health Check
    console.log('1️⃣ Running health check...');
    const isHealthy = await qdrantService.healthCheck();
    if (!isHealthy) {
      throw new Error('Qdrant health check failed');
    }
    console.log('✅ Qdrant is healthy\n');

    // 2. Initialize Collection
    console.log('2️⃣ Initializing collection...');
    await qdrantService.initializeCollection();
    console.log('✅ Collection initialized\n');

    // 3. Get Collection Info
    console.log('3️⃣ Getting collection info...');
    const info = await qdrantService.getCollectionInfo();
    console.log('Collection Info:', {
      name: info.name || 'research_papers',
      vectorSize: info.config?.params?.vectors?.size,
      distance: info.config?.params?.vectors?.distance,
      pointsCount: info.points_count
    });
    console.log('✅ Collection info retrieved\n');

    // 4. Insert Test Vectors
    console.log('4️⃣ Inserting test vectors...');
    const testVectors = [
      {
        id: 1,  // Changed to integer
        vector: Array(384).fill(0).map(() => Math.random()),
        payload: {
          paper_id: 'paper-123',
          section: 'Introduction',
          page: 1,
          text: 'This is a test chunk about machine learning.',
          chunk_index: 0
        }
      },
      {
        id: 2,  // Changed to integer
        vector: Array(384).fill(0).map(() => Math.random()),
        payload: {
          paper_id: 'paper-123',
          section: 'Methodology',
          page: 3,
          text: 'This chunk discusses neural network architectures.',
          chunk_index: 1
        }
      },
      {
        id: 3,  // Changed to integer
        vector: Array(384).fill(0).map(() => Math.random()),
        payload: {
          paper_id: 'paper-456',
          section: 'Results',
          page: 5,
          text: 'The results show improved accuracy.',
          chunk_index: 0
        }

      }
      ,
      {
      id: 4,
      vector: Array(384).fill(0).map(() => Math.random()),
    payload: {
      paper_id: '6904199967cb521dfc9ec83f',
      title: 'Blockchain Applications and Sustainability Issues',
      authors: ['John Doe', 'Jane Smith'],
      year: 2019,
      section: 'Methodology',
      page: 2,
      chunk_index: 3,
      text: 'Bitcoin is a cryptocurrency based on the blockchain technology, which make use of secure\n' +
        '\n' +
        'cryptographic algorithms supported by a peer-to-peer network. Blockchain is based on the\n' +
        '\n' +
        'following assumption: it rely on a peer-to-peer network and there is no need of a central\n' +
        '\n' +
        'server, it has a distributed consensus protocol that consists of digital signature and\n' +
        '\n' +
        'cryptography based on asymmetric public key mechanism, a timestamp system to make\n' +
        '\n' +
        'transaction traceable in a peer-to-peer network in which all nodes in the network are equal\n' +
        '\n' +
        'peers. To maintain and sustain the network the technology makes use of a remuneration in\n' +
        '\n' +
        'terms of a reward in Bitcoins given to the node of the network which resolve a simple but\n' +
        '\n' +
        'computing intensive task, necessary to validate a block of transactions (whose validity has\n' +
        '\n' +
        'been verified by the software), append it to the blockchain to disseminate in the network of\n' +
        '\n' +
        'all connected computers. As a limited and scarce resource the rate of emission of new\n' +
        '\n' +
        'Bitcoins or “Bitcoin mining”, resembles the iron or gold ores mining, because it has been\n' +
        '\n' +
        'modulated by an algorithmic limitation starting from 50 unities with an increase rate\n' +
        '\n' +
        'slowing down constantly to resemble the cumulated production of a natural resource: the\n' +
        '\n' +
        'emission rate will halve after the issue of 10.5 million Bitcoins, and will halve again after'
    }
  }
    ];

    await qdrantService.upsertVectors(testVectors);
    console.log('✅ Test vectors inserted\n');

    // 5. Count Points
    console.log('5️⃣ Counting points...');
    const count = await qdrantService.countPoints();
    console.log(`📊 Total points in collection: ${count}\n`);

    // 6. Search Similar Vectors
    console.log('6️⃣ Searching for similar vectors...');
    const queryVector = Array(384).fill(0).map(() => Math.random());
    const searchResults = await qdrantService.searchSimilar(queryVector, 3);
    console.log(`Found ${searchResults.length} similar vectors:`);
    searchResults.forEach((result, idx) => {
      console.log(`  ${idx + 1}. Score: ${result.score.toFixed(4)}, Paper: ${result.payload.paper_id}, Section: ${result.payload.section}`);
    });
    console.log('✅ Search completed\n');

    // 7. Search by Paper ID
    console.log('7️⃣ Searching by specific paper ID...');
    const paperResults = await qdrantService.searchByPaperIds(queryVector, ['paper-123'], 2);
    console.log(`Found ${paperResults.length} results for paper-123:`);
    paperResults.forEach((result, idx) => {
      console.log(`  ${idx + 1}. Section: ${result.payload.section}, Page: ${result.payload.page}`);
    });
    console.log('✅ Filtered search completed\n');

    // 8. Delete Test Vectors
    console.log('8️⃣ Cleaning up test data...');
    await qdrantService.deletePoints([1, 2, 3]);  // Changed to integers
    console.log('✅ Test data deleted\n');

    // 9. Verify Deletion
    console.log('9️⃣ Verifying deletion...');
    const finalCount = await qdrantService.countPoints();
    console.log(`📊 Final point count: ${finalCount}\n`);

    console.log('🎉 All Qdrant tests passed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testQdrant();