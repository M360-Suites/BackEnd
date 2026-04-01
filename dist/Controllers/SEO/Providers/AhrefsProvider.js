"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AhrefsProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const BaseProvider_1 = require("./BaseProvider");
class AhrefsProvider extends BaseProvider_1.BaseSEOProvider {
    constructor(apiKey) {
        super("https://api.ahrefs.com/v3", "ahrefs");
        this.baseURL = "https://api.ahrefs.com/v3";
        this.apiKey = apiKey;
    }
    async getBacklinks(target, mode = "domain", limit = 100, offset = 0) {
        const cacheKey = `ahrefs:backlinks:${target}`;
        let response = this.getCachedOrFetch(cacheKey, async () => {
            await this.client.get("/backlinks", {
                params: {
                    token: this.apiKey,
                    target,
                    mode,
                    limit,
                    offset,
                    output: "json",
                },
            });
        }, 259200); // Cache for 3 days
        return {
            total: response.data.total || 0,
            backlinks: response.data.backlinks || [],
        };
    }
    async getDomainMetrics(target) {
        const cacheKey = `ahrefs:backlinks:${target}`;
        let response = this.getCachedOrFetch(cacheKey, async () => {
            await this.client.get("/domain-rating", {
                params: {
                    token: this.apiKey,
                    target,
                    output: "json",
                },
            });
        });
        return response.data;
    }
    async getCompetitors(target) {
        try {
            const response = await axios_1.default.get(`${this.baseURL}/competitors`, {
                params: {
                    token: this.apiKey,
                    target,
                    mode: "domain",
                    output: "json",
                },
            });
            return response.data.competitors?.map((c) => c.domain) || [];
        }
        catch (error) {
            console.error("Ahrefs competitors error:", error.message);
            return [];
        }
    }
    async getOrganicKeywords(target) {
        try {
            const response = await axios_1.default.get(`${this.baseURL}/keywords`, {
                params: {
                    token: this.apiKey,
                    target,
                    output: "json",
                },
            });
            return response.data.keywords || [];
        }
        catch (error) {
            console.error("Ahrefs keywords error:", error.message);
            return [];
        }
    }
    async checkQuota() {
        try {
            const response = await this.client.get("/account", {
                params: { token: this.apiKey },
            });
            return response.data.credits_left > 0;
        }
        catch {
            return false;
        }
    }
}
exports.AhrefsProvider = AhrefsProvider;
