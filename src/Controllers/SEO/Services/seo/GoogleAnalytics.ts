import { HttpClient } from "../http/HttpClient";
import { AnalyticsEvent } from "../../../../Types/seo";

export class GoogleAnalyticsService {
  private httpClient: HttpClient;
  private propertyId: string;
  private apiSecret?: string;
  private measurementId?: string;

  constructor(
    propertyId: string = "510064787",
    apiSecret?: string,
    measurementId: string = "G-35Q07Y3H0V"
  ) {
    this.propertyId = propertyId;
    this.apiSecret = apiSecret;
    this.measurementId = measurementId;
    this.httpClient = new HttpClient("https://www.google-analytics.com");
  }

  /**
   * Send event to Google Analytics 4
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const payload = {
        client_id: this.generateClientId(),
        events: [
          {
            name: event.name,
            params: {
              ...event.params,
              engagement_time_msec: "100",
              session_id: this.generateSessionId(),
              timestamp: Date.now(),
            },
          },
        ],
      };

      if (this.measurementId && this.apiSecret) {
        await this.httpClient.post(
          `/mp/collect?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`,
          payload
        );
      }
    } catch (error) {
      console.error("Google Analytics tracking error:", error);
    }
  }

  /**
   * Track page view
   */
  async trackPageView(pageTitle: string, pageLocation: string): Promise<void> {
    await this.trackEvent({
      name: "page_view",
      params: {
        page_title: pageTitle,
        page_location: pageLocation,
      },
    });
  }

  /**
   * Get analytics data using Google Analytics Data API
   */
  async getAnalyticsReport(
    startDate: string,
    endDate: string,
    metrics: string[],
    dimensions: string[]
  ): Promise<any> {
    try {
      // This requires Google Analytics Data API
      // You'll need to set up proper authentication
      const response = await this.httpClient.post(
        `https://analyticsdata.googleapis.com/v1beta/properties/${this.propertyId}:runReport`,
        {
          dateRanges: [{ startDate, endDate }],
          dimensions: dimensions.map((dimen) => ({ name: dimen })),
          metrics: metrics.map((metric) => ({ name: metric })),
        },
        {
          headers: {
            "x-goog-user-project": `${this.propertyId}`,
            "Content-Type": " application/json",
            Authorization: `Bearer ${""}`,
          },
        }
      );
      return response;
    } catch (error) {
      console.error("Error fetching Analytics data:", error);
      throw error;
    }
  }

  private generateClientId(): string {
    return `GA1.1.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
