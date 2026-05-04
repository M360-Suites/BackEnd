import mongoose from 'mongoose';
import { config } from 'dotenv';
import { beforeAll, afterAll, describe, it, expect } from '@jest/globals';

// Load environment variables
config({ path: '.env.test' });

// Setup and teardown for tests
beforeAll(async () => {
  // Use a test database
  const testDbUri = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/m360_test';
  await mongoose.connect(testDbUri, { dbName: 'deploy_test' });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});
