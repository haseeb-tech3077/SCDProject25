const { MongoClient } = require('mongodb');
require('dotenv').config();

// Load from environment variables
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:3000';
const DB_NAME = process.env.DB_NAME || 'nodevault';

let client = null;
let db = null;

async function connectDB() {
  if (db) return db;
  
  try {

    if (!process.env.MONGO_URI) {
      console.warn('MONGO_URI not found in .env file. Using default: mongodb://localhost:27017');
    }
    
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`Connected to MongoDB: ${DB_NAME}`);
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    console.error('Make sure MongoDB is running and check your .env file');
    throw error;
  }
}

async function getCollection(collectionName) {
  const database = await connectDB();
  return database.collection(collectionName);
}

async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

// Test connection on module load
async function testConnection() {
  try {
    await connectDB();
    console.log('Database connection test successful');
  } catch (error) {
    console.error('Database connection test failed');
  }
}

module.exports = { connectDB, getCollection, closeDB, testConnection };
