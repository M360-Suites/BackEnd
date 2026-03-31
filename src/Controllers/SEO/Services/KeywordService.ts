import { KeywordRanking } from "../../../Models/SEOModels";
import { SerpAPIProvider } from "../Providers";


export class KeywordService {
  private serpProvider: SerpAPIProvider;

  constructor() {
    this.serpProvider = new SerpAPIProvider(process.env.SERP_KEY!);
  }

  async trackKeyword(
    organizationId: string,
    domain: string,
    keyword: string,
    location: string = "us",
  ): Promise<void> {
    // Get current ranking
    const ranking = await this.serpProvider.getKeywordRankings(
      keyword,
      domain,
      location,
    );

    // Save to database
    await KeywordRanking.create({
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

  async trackMultipleKeywords(
    organizationId: string,
    domain: string,
    keywords: string[],
    location: string = "us",
  ): Promise<void> {
    for (const keyword of keywords) {
      await this.trackKeyword(organizationId, domain, keyword, location);
      await this.delay(1000); // Rate limiting
    }
  }

  async getRankingHistory(
    organizationId: string,
    domain: string,
    keyword: string,
    days: number = 30,
  ): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return KeywordRanking.find({
      organizationId,
      domain,
      keyword,
      date: { $gte: startDate },
    }).sort({ date: 1 });
  }

  async getKeywordSuggestions(
    keyword: string,
    limit: number = 10,
  ): Promise<any[]> {
    return this.serpProvider.getKeywordSuggestions(keyword, limit);
  }

  async getCompetitorKeywords(
    competitorDomain: string,
    limit: number = 50,
  ): Promise<any[]> {
    // This would require additional API calls or scraping
    // Simplified implementation
    return [];
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
