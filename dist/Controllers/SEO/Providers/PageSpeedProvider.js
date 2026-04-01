"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageSpeedProvider = void 0;
const BaseProvider_1 = require("./BaseProvider");
class PageSpeedProvider extends BaseProvider_1.BaseSEOProvider {
    constructor(apiKey) {
        super("https://www.googleapis.com/pagespeedonline/v5", "pagespeed");
        this.apiKey = apiKey;
    }
    async analyzeUrl(url, strategy = "mobile", categories = [
        "performance",
        "accessibility",
        "best-practices",
        "seo",
    ]) {
        const cacheKey = `psi:${url}:${strategy}:${categories.join(",")}`;
        return this.getCachedOrFetch(cacheKey, async () => {
            const categoryParams = categories
                .map((cat) => `category=${cat.toUpperCase()}`)
                .join("&");
            const response = await this.client.get(`/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&${categoryParams}&key=${this.apiKey}`);
            const lighthouse = response.data.lighthouseResult;
            const audits = lighthouse.audits;
            return {
                performance: Math.round((lighthouse.categories.performance?.score || 0) * 100),
                accessibility: Math.round((lighthouse.categories.accessibility?.score || 0) * 100),
                bestPractices: Math.round((lighthouse.categories["best-practices"]?.score || 0) * 100),
                seo: Math.round((lighthouse.categories.seo?.score || 0) * 100),
                firstContentfulPaint: audits["first-contentful-paint"]?.numericValue || 0,
                largestContentfulPaint: audits["largest-contentful-paint"]?.numericValue || 0,
                cumulativeLayoutShift: audits["cumulative-layout-shift"]?.numericValue || 0,
                speedIndex: audits["speed-index"]?.numericValue || 0,
                timeToInteractive: audits["interactive"]?.numericValue || 0,
                totalBlockingTime: audits["total-blocking-time"]?.numericValue || 0,
            };
        }, 86400); // Cache for 24 hours
    }
    async checkQuota() {
        // PageSpeed Insights has generous free quota (25,000 req/day)
        return true;
    }
}
exports.PageSpeedProvider = PageSpeedProvider;
