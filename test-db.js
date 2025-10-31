require('dotenv').config();
const mongoose = require('mongoose');
const Paper = require('./src/models/Paper');
const Query = require('./src/models/Query');
const { connectDB } = require('./src/config/database');

async function testModels() {
  await connectDB();
  
  console.log('📝 Testing Paper model...');
  const paper = new Paper({
    title: 'Test Paper',
    authors: ['John Doe'],
    year: 2024,
    fileName: 'test.pdf',
    filePath: '/uploads/test.pdf',
    fileSize: 1024
  });
  
  const savedPaper = await paper.save();
  console.log('✅ Paper saved:', savedPaper._id);
  
  console.log('📝 Testing Query model...');
  const query = new Query({
    question: 'What is machine learning?',
    answer: 'Machine learning is...',
    metrics: {
      responseTime: 1500
    }
  });
  
  const savedQuery = await query.save();
  console.log('✅ Query saved:', savedQuery._id);
  
  // Clean up
  await Paper.deleteOne({ _id: savedPaper._id });
  await Query.deleteOne({ _id: savedQuery._id });
  console.log('🧹 Test data cleaned up');
  
  await mongoose.connection.close();
  console.log('✅ All tests passed!');
}

testModels().catch(console.error);