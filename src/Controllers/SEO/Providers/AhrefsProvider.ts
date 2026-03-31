import axios from "axios";
import { BaseSEOProvider } from "./BaseProvider";

export interface BacklinkInfo {
  url_from: string;
  url_to: string;
  ahrefs_rank: number;
  domain_rating: number;
  url_rating: number;
  ip: string;
  refdomain: string;
  dofollow: boolean;
  original: boolean;
  anchor: string;
  text_pre: string;
  text_post: string;
  first_seen: string;
  last_visited: string;
  title: string;
}

export class AhrefsProvider extends BaseSEOProvider {
  private baseURL = "https://api.ahrefs.com/v3";
  private apiKey: string;

  constructor(apiKey: string) {
    super("https://api.ahrefs.com/v3", "ahrefs");
    this.apiKey = apiKey;
  }

  async getBacklinks(
    target: string,
    mode: "domain" | "subdomain" | "exact" = "domain",
    limit: number = 100,
    offset: number = 0,
  ): Promise<{ total: number; backlinks: BacklinkInfo[] }> {
    const cacheKey = `ahrefs:backlinks:${target}`;

    let response = this.getCachedOrFetch(
      cacheKey,
      async () => {
        await this.client.get("/backlinks", {
          params: {
            token: this.apiKey,
            target,
            mode,
            limit,
            offset,
            output: "json",
          },
        });
      },
      259200,
    ); // Cache for 3 days

    return {
      total: (response as any).data.total || 0,
      backlinks: (response as any).data.backlinks || [],
    };
  }

  async getDomainMetrics(target: string): Promise<{
    domain_rating: number;
    url_rating: number;
    ahrefs_rank: number;
    refdomains: number;
    backlinks: number;
    organic_keywords: number;
    organic_traffic: number;
  }> {
    const cacheKey = `ahrefs:backlinks:${target}`;
    let response = this.getCachedOrFetch(cacheKey, async () => {
      await this.client.get("/domain-rating", {
        params: {
          token: this.apiKey,
          target,
          output: "json",
        },
      });
    });
    return (response as any).data;
  }

  async getCompetitors(target: string): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseURL}/competitors`, {
        params: {
          token: this.apiKey,
          target,
          mode: "domain",
          output: "json",
        },
      });

      return response.data.competitors?.map((c: any) => c.domain) || [];
    } catch (error: any) {
      console.error("Ahrefs competitors error:", error.message);
      return [];
    }
  }

  async getOrganicKeywords(target: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseURL}/keywords`, {
        params: {
          token: this.apiKey,
          target,
          output: "json",
        },
      });

      return response.data.keywords || [];
    } catch (error: any) {
      console.error("Ahrefs keywords error:", error.message);
      return [];
    }
  }

  async checkQuota(): Promise<boolean> {
    try {
      const response = await this.client.get("/account", {
        params: { token: this.apiKey },
      });
      return response.data.credits_left > 0;
    } catch {
      return false;
    }
  }
}
