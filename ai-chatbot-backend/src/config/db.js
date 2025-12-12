import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'glinax_chatbot_db';

let client = null;
let db = null;

// Connect to MongoDB
export const connectDB = async () => {
  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      db = client.db(DB_NAME);
      console.log('✅ Connected to MongoDB Atlas');
    }
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

// Get database instance
export const getDB = async () => {
  if (!db) {
    await connectDB();
  }
  return db;
};

// Close connection
export const closeDB = async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
};

// Collections helper
export const getCollection = async (collectionName) => {
  const database = await getDB();
  return database.collection(collectionName);
};

export default { connectDB, getDB, closeDB, getCollection };