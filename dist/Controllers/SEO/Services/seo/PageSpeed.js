"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageSpeedService = void 0;
const HttpClient_1 = require("../http/HttpClient");
class PageSpeedService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.httpClient = new HttpClient_1.HttpClient("https://www.googleapis.com/pagespeedonline/v5");
    }
    /**
     * Analyze URL with PageSpeed Insights - ALL categories
     */
    async analyzeUrl(url, strategy = "mobile", categories = [
        "performance",
        "accessibility",
        "best-practices",
        "seo",
    ]) {
        try {
            // Build the categories query parameters
            const categoryParams = categories
                .map((category) => `category=${encodeURIComponent(category.toUpperCase())}`)
                .join("&");
            const response = await this.httpClient.get(`/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&${categoryParams}&key=${this.apiKey}`);
            const preMetrics = response.loadingExperience;
            const lighthouse = response.lighthouseResult;
            const audits = lighthouse.audits;
            console.log("Metrics: ", preMetrics);
            console.log("Lighthouse Result: ", response.lighthouseResult);
            console.log("Audits Result: ", lighthouse.audits);
            // Extract all category scores
            const metrics = {
                performance: Math.round((lighthouse.categories.performance?.score || 0) * 100),
                accessibility: Math.round((lighthouse.categories.accessibility?.score || 0) * 100),
                bestPractices: Math.round((lighthouse.categories["best-practices"]?.score || 0) * 100),
                seo: Math.round((lighthouse.categories.seo?.score || 0) * 100),
                firstContentfulPaint: audits["first-contentful-paint"]?.numericValue || 0,
                largestContentfulPaint: audits["largest-contentful-paint"]?.numericValue || 0,
                cumulativeLayoutShift: audits["cumulative-layout-shift"]?.numericValue || 0,
                speedIndex: audits["speed-index"]?.numericValue || 0,
            };
            return metrics;
        }
        catch (error) {
            console.error("PageSpeed Insights API error:", error);
            throw error;
        }
    }
    /**
     * Analyze URL for both mobile and desktop with all categories
     */
    async analyzeUrlComprehensive(url, categories = [
        "performance",
        "accessibility",
        "best-practices",
        "seo",
    ]) {
        const [mobile, desktop] = await Promise.all([
            this.analyzeUrl(url, "mobile", categories),
            this.analyzeUrl(url, "desktop", categories),
        ]);
        return { mobile, desktop };
    }
    /**
     * Analyze specific categories only
     */
    async analyzeSpecificCategories(url, categories, strategy = "mobile") {
        return await this.analyzeUrl(url, strategy, categories);
    }
    /**
     * Batch analyze multiple URLs
     */
    async analyzeMultipleUrls(urls, strategy = "mobile") {
        const results = new Map();
        // Process URLs in batches to avoid rate limiting
        const batchSize = 5;
        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            const batchPromises = batch.map(async (url) => {
                try {
                    const metrics = await this.analyzeUrl(url, strategy);
                    results.set(url, metrics);
                }
                catch (error) {
                    console.error(`Error analyzing ${url}:`, error);
                    results.set(url, this.getDefaultMetrics());
                }
            });
            await Promise.all(batchPromises);
            // Add delay between batches to avoid rate limiting
            if (i + batchSize < urls.length) {
                await this.delay(1000);
            }
        }
        return results;
    }
    getDefaultMetrics() {
        return {
            performance: 0,
            accessibility: 0,
            bestPractices: 0,
            seo: 0,
            firstContentfulPaint: 0,
            largestContentfulPaint: 0,
            cumulativeLayoutShift: 0,
            speedIndex: 0,
        };
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.PageSpeedService = PageSpeedService;
