"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = void 0;
const redis_1 = require("./redis");
class CacheService {
    async get(key) {
        return await redis_1.redisClient.get(key);
    }
    async set(key, value, ttl) {
        if (ttl) {
            await redis_1.redisClient.set(key, value, 'EX', ttl);
        }
        else {
            await redis_1.redisClient.set(key, value);
        }
    }
    async delete(key) {
        await redis_1.redisClient.del(key);
    }
    async clear() {
        await redis_1.redisClient.flushdb();
    }
}
exports.cacheService = new CacheService();
