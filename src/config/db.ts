import mongoose from "mongoose";

// Create database connection cache
let cachedDb: typeof mongoose | null = null;

async function connectToDatabase():Promise<typeof mongoose> {
  if (cachedDb) {
    return cachedDb;
  }

  const dbUri = process.env.NODE_ENV === "production" 
    ? process.env.LIVE_MONGO_URI 
    : process.env.MONGODB_URI;

  if (!dbUri) {
    throw new Error('MongoDB URI is not defined');
  }

  try {
    const db = await mongoose.connect(dbUri);
    cachedDb = db;
    console.log('Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}
export default connectToDatabase;