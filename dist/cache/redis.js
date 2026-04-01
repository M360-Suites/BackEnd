"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../logger/logger");
const redisClient = new ioredis_1.default({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
});
exports.redisClient = redisClient;
// Handle connection events
redisClient.on("connect", () => {
    logger_1.logger.info("Connected to Redis");
});
redisClient.on("error", (err) => {
    logger_1.logger.error("Redis error:", err);
});
