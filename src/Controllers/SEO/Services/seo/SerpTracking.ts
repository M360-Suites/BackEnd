import { HttpClient } from "../http/HttpClient";
import { SerpRanking } from "../../../../Types/seo";
import { getJson } from "serpapi";

export class SerpTrackingService {
  private httpClient: HttpClient;
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.httpClient = new HttpClient();
  }

  /**
   * Check ranking for specific keyword and URL
   * Note: This is a simplified implementation
   * For production, consider using specialized SERP APIs like SerpAPI, DataForSEO, etc.
   */
  async checkRanking(
    keyword: string,
    url: string,
    domain: string = "google.com"
  ): Promise<SerpRanking> {
    try {
      // This is a placeholder implementation
      // In reality, you would use a SERP API service

      if (this.apiKey) {
        // Example with a hypothetical SERP API
        // const response = await this.httpClient.get<any>(
        //   `https://api.serpapi.com/search?q=${encodeURIComponent(
        //     keyword
        //   )}&engine=google&api_key=${this.apiKey}`
        // );

        const response = await getJson({engine: 'google', api_key: this.apiKey, q: keyword, location: ''})

        const position = this.findUrlPosition(response.organic_results, url);

        return {
          keyword,
          position,
          url,
          date: new Date(),
        };
      } else {
        // Fallback: manual checking or using other methods
        console.log(`Manual SERP check for "${keyword}" - ${url}`);

        // Return mock data for demonstration
        return {
          keyword,
          position: Math.floor(Math.random() * 100) + 1, // Mock position
          url,
          date: new Date(),
        };
      }
    } catch (error) {
      console.error("SERP tracking error:", error);
      throw error;
    }
  }

  /**
   * Track multiple keywords for a URL
   */
  async trackMultipleKeywords(
    keywords: string[],
    url: string
  ): Promise<SerpRanking[]> {
    const rankings: SerpRanking[] = [];

    for (const keyword of keywords) {
      try {
        const ranking = await this.checkRanking(keyword, url);
        rankings.push(ranking);

        // Add delay to avoid rate limiting
        await this.delay(500);
      } catch (error) {
        console.error(`Error tracking keyword "${keyword}":`, error);
      }
    }

    return rankings;
  }

  private findUrlPosition(organicResults: any[], url: string): number {
    if (!organicResults) return -1;

    for (let i = 0; i < organicResults.length; i++) {
      if (organicResults[i].link.includes(url)) {
        return i + 1; // Positions are 1-based
      }
    }
    return -1; // Not found in top results
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
