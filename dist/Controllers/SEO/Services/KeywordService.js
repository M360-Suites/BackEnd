"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeywordService = void 0;
const SEOModels_1 = require("../../../Models/SEOModels");
const Providers_1 = require("../Providers");
class KeywordService {
    constructor() {
        this.serpProvider = new Providers_1.SerpAPIProvider(process.env.SERP_KEY);
    }
    async trackKeyword(organizationId, domain, keyword, location = "us") {
        // Get current ranking
        const ranking = await this.serpProvider.getKeywordRankings(keyword, domain, location);
        // Save to database
        await SEOModels_1.KeywordRanking.create({
            organizationId,
            domain,
            keyword,
            location,
            position: ranking.position,
            url: ranking.url,
            title: ranking.title,
            snippet: ranking.snippet,
            date: ranking.date,
        });
    }
    async trackMultipleKeywords(organizationId, domain, keywords, location = "us") {
        for (const keyword of keywords) {
            await this.trackKeyword(organizationId, domain, keyword, location);
            await this.delay(1000); // Rate limiting
        }
    }
    async getRankingHistory(organizationId, domain, keyword, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        return SEOModels_1.KeywordRanking.find({
            organizationId,
            domain,
            keyword,
            date: { $gte: startDate },
        }).sort({ date: 1 });
    }
    async getKeywordSuggestions(keyword, limit = 10) {
        return this.serpProvider.getKeywordSuggestions(keyword, limit);
    }
    async getCompetitorKeywords(competitorDomain, limit = 50) {
        // This would require additional API calls or scraping
        // Simplified implementation
        return [];
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.KeywordService = KeywordService;
