import axios, { AxiosInstance } from "axios";
import { Redis } from "ioredis";

export abstract class BaseSEOProvider {
  protected client: AxiosInstance;
  protected cache: Redis;
  protected providerName: string;

  constructor(baseURL: string, providerName: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SEO-SaaS-Platform/1.0",
      },
    });

    this.cache = new Redis(process.env.REDIS_URL!);
    this.providerName = providerName;

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 429) {
          console.warn(`Rate limited by ${this.providerName}, retrying...`);
          await this.delay(2000);
          return this.client.request(error.config);
        }
        return Promise.reject(error);
      },
    );
  }

  protected async getCachedOrFetch<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    ttl: number = 3600,
  ): Promise<T> {
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const data = await fetchFn();
    await this.cache.setex(cacheKey, ttl, JSON.stringify(data));
    return data;
  }

  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  abstract checkQuota(): Promise<boolean>;
}
