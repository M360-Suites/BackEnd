"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerpAPIProvider = void 0;
const BaseProvider_1 = require("./BaseProvider");
class SerpAPIProvider extends BaseProvider_1.BaseSEOProvider {
    constructor(apiKey) {
        super("https://serpapi.com", "serpapi");
        this.apiKey = apiKey;
    }
    async getKeywordRankings(keyword, domain, location = "us", numResults = 100) {
        const cacheKey = `serp:${keyword}:${domain}:${location}`;
        return this.getCachedOrFetch(cacheKey, async () => {
            const params = new URLSearchParams({
                q: keyword,
                location,
                hl: "en",
                gl: "us",
                google_domain: "google.com",
                api_key: this.apiKey,
                num: numResults.toString(),
            });
            const response = await this.client.get(`/search?${params}`);
            // Find our domain in results
            const position = this.findDomainPosition(response.data.organic_results, domain);
            return {
                position,
                url: domain,
                title: response.data.organic_results[position - 1]?.title || "",
                snippet: response.data.organic_results[position - 1]?.snippet || "",
                date: new Date(),
            };
        }, 7200); // Cache for 2 hours
    }
    async getKeywordSuggestions(keyword, limit = 10) {
        const cacheKey = `suggestions:${keyword}`;
        return this.getCachedOrFetch(cacheKey, async () => {
            // Use SerpAPI's related searches
            const params = new URLSearchParams({
                q: keyword,
                engine: "google_autocomplete",
                api_key: this.apiKey,
            });
            const response = await this.client.get(`/search?${params}`);
            return response.data.suggestions
                .slice(0, limit)
                .map((suggestion) => ({
                keyword: suggestion.value,
                volume: suggestion.volume || 0,
                difficulty: suggestion.difficulty || 0,
            }));
        }, 86400); // Cache for 24 hours
    }
    async checkQuota() {
        try {
            const response = await this.client.get(`/account?api_key=${this.apiKey}`);
            return response.data.searches_left > 0;
        }
        catch {
            return false;
        }
    }
    findDomainPosition(results, domain) {
        for (let i = 0; i < results.length; i++) {
            if (results[i].link.includes(domain)) {
                return i + 1;
            }
        }
        return -1;
    }
}
exports.SerpAPIProvider = SerpAPIProvider;
