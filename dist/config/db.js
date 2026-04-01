"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../logger/logger");
// Create database connection cache
let cachedDb = null;
async function connectToDatabase() {
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
        const db = await mongoose_1.default.connect(dbUri);
        cachedDb = db;
        logger_1.logger.info('Connected to MongoDB');
        return db;
    }
    catch (error) {
        logger_1.logger.error('MongoDB connection error:', error);
        throw error;
    }
}
exports.default = connectToDatabase;
