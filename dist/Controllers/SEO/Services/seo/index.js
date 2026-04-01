"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEOService = void 0;
const MicrosoftClarity_1 = require("./MicrosoftClarity");
const GoogleAnalytics_1 = require("./GoogleAnalytics");
const PageSpeed_1 = require("./PageSpeed");
const SerpTracking_1 = require("./SerpTracking");
class SEOService {
    constructor(config) {
        this.clarityService = new MicrosoftClarity_1.MicrosoftClarityService(config.microsoftClarity?.projectId || "", config.microsoftClarity?.apiKey || "");
        this.analyticsService = new GoogleAnalytics_1.GoogleAnalyticsService(config.googleAnalytics?.propertyId || "", config.googleAnalytics?.apiSecret || "", config.googleAnalytics?.measurementId || "");
        this.pageSpeedService = new PageSpeed_1.PageSpeedService(config.pageSpeed.apiKey);
        this.serpService = new SerpTracking_1.SerpTrackingService(config.serpTracking?.apiKey);
    }
    /**
     * Comprehensive SEO analysis for a URL
     */
    async analyzeSEO(url) {
        try {
            // Analyze page speed
            const pageSpeed = await this.pageSpeedService.analyzeUrlComprehensive(url);
            // Track page view in analytics
            await this.analyticsService.trackPageView("SEO Analysis", url);
            // Track event in Clarity
            await this.clarityService.trackEvent("seo_analysis", { url });
            return {
                pageSpeed,
            };
        }
        catch (error) {
            console.error("SEO analysis error:", error);
            throw error;
        }
    }
    /**
     * Track custom analytics event
     */
    async trackAnalyticsEvent(event) {
        await this.analyticsService.trackEvent(event);
    }
    /**
     * Track custom Clarity event
     */
    async trackClarityEvent(eventName, eventData) {
        await this.clarityService.trackEvent(eventName, eventData);
    }
    /**
     * Get page speed metrics for multiple URLs
     */
    async batchAnalyzePerformance(urls) {
        return await this.pageSpeedService.analyzeMultipleUrls(urls);
    }
    /**
     * Track SERP rankings for keywords
     */
    async trackSERPRankings(keywords, url) {
        return await this.serpService.trackMultipleKeywords(keywords, url);
    }
    /**
     * Get services for direct access if needed
     */
    getServices() {
        return {
            clarity: this.clarityService,
            analytics: this.analyticsService,
            pageSpeed: this.pageSpeedService,
            serp: this.serpService,
        };
    }
}
exports.SEOService = SEOService;
