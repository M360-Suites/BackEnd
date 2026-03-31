import { MicrosoftClarityService } from "./MicrosoftClarity";
import { GoogleAnalyticsService } from "./GoogleAnalytics";
import { PageSpeedService } from "./PageSpeed";
import { SerpTrackingService } from "./SerpTracking";
import {
  SEOConfig,
  PageSpeedMetrics,
  SerpRanking,
  AnalyticsEvent,
} from "../../../../Types/seo";

export class SEOService {
  private clarityService: MicrosoftClarityService;
  private analyticsService: GoogleAnalyticsService;
  private pageSpeedService: PageSpeedService;
  private serpService: SerpTrackingService;

  constructor(config: SEOConfig) {
    this.clarityService = new MicrosoftClarityService(
      config.microsoftClarity?.projectId || "",
      config.microsoftClarity?.apiKey || ""
    );
    this.analyticsService = new GoogleAnalyticsService(
      config.googleAnalytics?.propertyId || "",
      config.googleAnalytics?.apiSecret || "",
      config.googleAnalytics?.measurementId || ""
    );
    this.pageSpeedService = new PageSpeedService(config.pageSpeed.apiKey);
    this.serpService = new SerpTrackingService(config.serpTracking?.apiKey);
  }

  /**
   * Comprehensive SEO analysis for a URL
   */
  async analyzeSEO(url: string): Promise<{
    pageSpeed: {
      mobile: PageSpeedMetrics;
      desktop: PageSpeedMetrics;
    };
    rankings?: SerpRanking[];
  }> {
    try {
      // Analyze page speed
      const pageSpeed = await this.pageSpeedService.analyzeUrlComprehensive(
        url
      );

      // Track page view in analytics
      await this.analyticsService.trackPageView("SEO Analysis", url);

      // Track event in Clarity
      await this.clarityService.trackEvent("seo_analysis", { url });

      return {
        pageSpeed,
      };
    } catch (error) {
      console.error("SEO analysis error:", error);
      throw error;
    }
  }

  /**
   * Track custom analytics event
   */
  async trackAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
    await this.analyticsService.trackEvent(event);
  }

  /**
   * Track custom Clarity event
   */
  async trackClarityEvent(
    eventName: string,
    eventData: Record<string, any>
  ): Promise<void> {
    await this.clarityService.trackEvent(eventName, eventData);
  }

  /**
   * Get page speed metrics for multiple URLs
   */
  async batchAnalyzePerformance(
    urls: string[]
  ): Promise<Map<string, PageSpeedMetrics>> {
    return await this.pageSpeedService.analyzeMultipleUrls(urls);
  }

  /**
   * Track SERP rankings for keywords
   */
  async trackSERPRankings(
    keywords: string[],
    url: string
  ): Promise<SerpRanking[]> {
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
