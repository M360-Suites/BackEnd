"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = require("dotenv");
const globals_1 = require("@jest/globals");
// Load environment variables
(0, dotenv_1.config)({ path: '.env.test' });
// Setup and teardown for tests
(0, globals_1.beforeAll)(async () => {
    // Use a test database
    const testDbUri = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/m360_test';
    await mongoose_1.default.connect(testDbUri);
});
(0, globals_1.afterAll)(async () => {
    await mongoose_1.default.connection.dropDatabase();
    await mongoose_1.default.connection.close();
});
