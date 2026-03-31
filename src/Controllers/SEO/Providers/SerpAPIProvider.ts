import { BaseSEOProvider } from "./BaseProvider";

export interface SerpResult {
  organic_results: Array<{
    position: number;
    title: string;
    link: string;
    displayed_link: string;
    snippet: string;
  }>;
  related_searches: Array<{ query: string }>;
  search_information: {
    total_results: number;
    time_taken_displayed: number;
  };
}

export class SerpAPIProvider extends BaseSEOProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    super("https://serpapi.com", "serpapi");
    this.apiKey = apiKey;
  }

  async getKeywordRankings(
    keyword: string,
    domain: string,
    location: string = "us",
    numResults: number = 100,
  ): Promise<{
    position: number;
    url: string;
    title: string;
    snippet: string;
    date: Date;
  }> {
    const cacheKey = `serp:${keyword}:${domain}:${location}`;

    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        const params = new URLSearchParams({
          q: keyword,
          location,
          hl: "en",
          gl: "us",
          google_domain: "google.com",
          api_key: this.apiKey,
          num: numResults.toString(),
        });

        const response = await this.client.get<SerpResult>(`/search?${params}`);

        // Find our domain in results
        const position = this.findDomainPosition(
          response.data.organic_results,
          domain,
        );

        return {
          position,
          url: domain,
          title: response.data.organic_results[position - 1]?.title || "",
          snippet: response.data.organic_results[position - 1]?.snippet || "",
          date: new Date(),
        };
      },
      7200,
    ); // Cache for 2 hours
  }

  async getKeywordSuggestions(
    keyword: string,
    limit: number = 10,
  ): Promise<Array<{ keyword: string; volume?: number; difficulty?: number }>> {
    const cacheKey = `suggestions:${keyword}`;

    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        // Use SerpAPI's related searches
        const params = new URLSearchParams({
          q: keyword,
          engine: "google_autocomplete",
          api_key: this.apiKey,
        });

        const response = await this.client.get(`/search?${params}`);

        return response.data.suggestions
          .slice(0, limit)
          .map((suggestion: any) => ({
            keyword: suggestion.value,
            volume: suggestion.volume || 0,
            difficulty: suggestion.difficulty || 0,
          }));
      },
      86400,
    ); // Cache for 24 hours
  }

  async checkQuota(): Promise<boolean> {
    try {
      const response = await this.client.get(`/account?api_key=${this.apiKey}`);
      return response.data.searches_left > 0;
    } catch {
      return false;
    }
  }

  private findDomainPosition(results: any[], domain: string): number {
    for (let i = 0; i < results.length; i++) {
      if (results[i].link.includes(domain)) {
        return i + 1;
      }
    }
    return -1;
  }
}
