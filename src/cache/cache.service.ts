import { redisClient } from './redis';

class CacheService {
  async get(key: string): Promise<string | null> {
    return await redisClient.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await redisClient.set(key, value, 'EX', ttl);
    } else {
      await redisClient.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    await redisClient.del(key);
  }

  async clear(): Promise<void> {
    await redisClient.flushdb();
  }
}

export const cacheService = new CacheService();