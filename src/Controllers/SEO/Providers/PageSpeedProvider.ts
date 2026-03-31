import { BaseSEOProvider } from "./BaseProvider";

export interface PageSpeedMetrics {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  speedIndex: number;
  timeToInteractive?: number;
  totalBlockingTime?: number;
}

export class PageSpeedProvider extends BaseSEOProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    super("https://www.googleapis.com/pagespeedonline/v5", "pagespeed");
    this.apiKey = apiKey;
  }

  async analyzeUrl(
    url: string,
    strategy: "mobile" | "desktop" = "mobile",
    categories: string[] = [
      "performance",
      "accessibility",
      "best-practices",
      "seo",
    ],
  ): Promise<PageSpeedMetrics> {
    const cacheKey = `psi:${url}:${strategy}:${categories.join(",")}`;

    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        const categoryParams = categories
          .map((cat) => `category=${cat.toUpperCase()}`)
          .join("&");

        const response = await this.client.get(
          `/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&${categoryParams}&key=${this.apiKey}`,
        );

        const lighthouse = response.data.lighthouseResult;
        const audits = lighthouse.audits;

        return {
          performance: Math.round(
            (lighthouse.categories.performance?.score || 0) * 100,
          ),
          accessibility: Math.round(
            (lighthouse.categories.accessibility?.score || 0) * 100,
          ),
          bestPractices: Math.round(
            (lighthouse.categories["best-practices"]?.score || 0) * 100,
          ),
          seo: Math.round((lighthouse.categories.seo?.score || 0) * 100),
          firstContentfulPaint:
            audits["first-contentful-paint"]?.numericValue || 0,
          largestContentfulPaint:
            audits["largest-contentful-paint"]?.numericValue || 0,
          cumulativeLayoutShift:
            audits["cumulative-layout-shift"]?.numericValue || 0,
          speedIndex: audits["speed-index"]?.numericValue || 0,
          timeToInteractive: audits["interactive"]?.numericValue || 0,
          totalBlockingTime: audits["total-blocking-time"]?.numericValue || 0,
        };
      },
      86400,
    ); // Cache for 24 hours
  }

  async checkQuota(): Promise<boolean> {
    // PageSpeed Insights has generous free quota (25,000 req/day)
    return true;
  }
}
