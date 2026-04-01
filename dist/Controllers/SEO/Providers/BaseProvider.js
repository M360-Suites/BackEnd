"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseSEOProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const ioredis_1 = require("ioredis");
class BaseSEOProvider {
    constructor(baseURL, providerName) {
        this.client = axios_1.default.create({
            baseURL,
            timeout: 30000,
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "SEO-SaaS-Platform/1.0",
            },
        });
        this.cache = new ioredis_1.Redis(process.env.REDIS_URL);
        this.providerName = providerName;
        this.setupInterceptors();
    }
    setupInterceptors() {
        this.client.interceptors.response.use((response) => response, async (error) => {
            if (error.response?.status === 429) {
                console.warn(`Rate limited by ${this.providerName}, retrying...`);
                await this.delay(2000);
                return this.client.request(error.config);
            }
            return Promise.reject(error);
        });
    }
    async getCachedOrFetch(cacheKey, fetchFn, ttl = 3600) {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const data = await fetchFn();
        await this.cache.setex(cacheKey, ttl, JSON.stringify(data));
        return data;
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.BaseSEOProvider = BaseSEOProvider;
