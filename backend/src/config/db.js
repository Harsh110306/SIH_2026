const mongoose = require('mongoose');

// Function to connect to MongoDB Atlas
const connectDB = async () => {
  // Check if MONGO_URI is defined in .env
  if (!process.env.MONGO_URI || process.env.MONGO_URI.trim() === '') {
    console.log('⚠️  MONGO_URI is missing in your .env file.');
    console.log('👉 Please paste your MongoDB connection string into .env under MONGO_URI');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
  }
};

module.exports = connectDB;
