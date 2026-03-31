import {
  AdPlatformClient,
  MetaAdsClient,
  GoogleAdsClient,
  TwitterAdsClient,
  LinkedInAdsClient,
  TikTokAdsClient,
  // SnapchatAdsClient,
} from "../Clients";
import {
  AdsPlatform,
  Campaign,
  CampaignCreateParams,
  CampaignUpdateParams,
  AdSet,
  AdSetCreateParams,
  AdSetUpdateParams,
  Ad,
  AdCreateParams,
  AdUpdateParams,
  AdCreative,
  AdCreativeCreateParams,
  Audience,
  AudienceCreateParams,
  InsightsParams,
  InsightsResult,
  AccountInsights,
  AdAccount,
} from "../../../Types/ads";

export class AdManager {
  private clients: Map<string, AdPlatformClient> = new Map();

  registerClient(platform: AdsPlatform, client: AdPlatformClient): void {
    this.clients.set(platform, client);
  }

  getClient(platform: AdsPlatform): AdPlatformClient {
    const client = this.clients.get(platform);
    if (!client) {
      throw new Error(`No client registered for platform: ${platform}`);
    }
    return client;
  }

  // ============= ACCOUNTS ==============
  async getAdAccounts(platform: AdsPlatform): Promise<AdAccount[]> {
    return this.getClient(platform).getAdAccounts();
  }

  async getAdAccount(platform: AdsPlatform, accountId: string): Promise<AdAccount> {
    return this.getClient(platform).getAdAccount(accountId);
  }

  // ============= CAMPAIGNS =============
  async createCampaign(
    platform: AdsPlatform,
    params: CampaignCreateParams,
  ): Promise<Campaign> {
    return this.getClient(platform).createCampaign(params);
  }

  async getCampaigns(
    platform: AdsPlatform,
    params?: { status?: string; limit?: number },
  ): Promise<Campaign[]> {
    return this.getClient(platform).getCampaigns(params);
  }

  async getCampaign(
    platform: AdsPlatform,
    campaignId: string,
  ): Promise<Campaign> {
    return this.getClient(platform).getCampaign(campaignId);
  }

  async updateCampaign(
    platform: AdsPlatform,
    campaignId: string,
    params: CampaignUpdateParams,
  ): Promise<Campaign> {
    return this.getClient(platform).updateCampaign(campaignId, params);
  }

  async deleteCampaign(
    platform: AdsPlatform,
    campaignId: string,
  ): Promise<{ success: boolean }> {
    return this.getClient(platform).deleteCampaign(campaignId);
  }

  // ============= AD SETS =============
  async createAdSet(
    platform: AdsPlatform,
    params: AdSetCreateParams,
  ): Promise<AdSet> {
    return this.getClient(platform).createAdSet(params);
  }

  async getAdSets(
    platform: AdsPlatform,
    campaignId?: string,
    params?: { status?: string; limit?: number },
  ): Promise<AdSet[]> {
    return this.getClient(platform).getAdSets(campaignId, params);
  }

  async getAdSet(platform: AdsPlatform, adSetId: string): Promise<AdSet> {
    return this.getClient(platform).getAdSet(adSetId);
  }

  async updateAdSet(
    platform: AdsPlatform,
    adSetId: string,
    params: AdSetUpdateParams,
  ): Promise<AdSet> {
    return this.getClient(platform).updateAdSet(adSetId, params);
  }

  async deleteAdSet(
    platform: AdsPlatform,
    adSetId: string,
  ): Promise<{ success: boolean }> {
    return this.getClient(platform).deleteAdSet(adSetId);
  }

  // ============= ADS =============
  async createAd(platform: AdsPlatform, params: AdCreateParams): Promise<Ad> {
    return this.getClient(platform).createAd(params);
  }

  async getAds(
    platform: AdsPlatform,
    adSetId?: string,
    params?: { status?: string; limit?: number },
  ): Promise<Ad[]> {
    return this.getClient(platform).getAds(adSetId, params);
  }

  async getAd(platform: AdsPlatform, adId: string): Promise<Ad> {
    return this.getClient(platform).getAd(adId);
  }

  async updateAd(
    platform: AdsPlatform,
    adId: string,
    params: AdUpdateParams,
  ): Promise<Ad> {
    return this.getClient(platform).updateAd(adId, params);
  }

  async deleteAd(
    platform: AdsPlatform,
    adId: string,
  ): Promise<{ success: boolean }> {
    return this.getClient(platform).deleteAd(adId);
  }

  // ============= CREATIVES =============
  async createAdCreative(
    platform: AdsPlatform,
    params: AdCreativeCreateParams,
  ): Promise<AdCreative> {
    return this.getClient(platform).createCreative(params);
  }

  async getCreatives(
    platform: AdsPlatform,
    params?: { limit?: number },
  ): Promise<AdCreative[]> {
    return this.getClient(platform).getCreatives(params);
  }

  async getCreative(
    platform: AdsPlatform,
    creativeId: string,
  ): Promise<AdCreative> {
    return this.getClient(platform).getCreative(creativeId);
  }

  async updateCreative(
    platform: AdsPlatform,
    creativeId: string,
    params: Partial<AdCreativeCreateParams>,
  ): Promise<AdCreative> {
    return this.getClient(platform).updateCreative(creativeId, params);
  }

  async deleteCreative(
    platform: AdsPlatform,
    creativeId: string,
  ): Promise<{ success: boolean }> {
    return this.getClient(platform).deleteCreative(creativeId);
  }

  // ============= AUDIENCES =============
  async createAudience(
    platform: AdsPlatform,
    params: AudienceCreateParams,
  ): Promise<Audience> {
    return this.getClient(platform).createAudience(params);
  }

  async getAudiences(
    platform: AdsPlatform,
    params?: { limit?: number },
  ): Promise<Audience[]> {
    return this.getClient(platform).getAudiences(params);
  }

  async getAudience(
    platform: AdsPlatform,
    audienceId: string,
  ): Promise<Audience> {
    return this.getClient(platform).getAudience(audienceId);
  }

  async updateAudience(
    platform: AdsPlatform,
    audienceId: string,
    params: Partial<AudienceCreateParams>,
  ): Promise<Audience> {
    return this.getClient(platform).updateAudience(audienceId, params);
  }

  async deleteAudience(
    platform: AdsPlatform,
    audienceId: string,
  ): Promise<{ success: boolean }> {
    return this.getClient(platform).deleteAudience(audienceId);
  }

  // ============= INSIGHTS =============
  async getAccountInsights(
    platform: AdsPlatform,
    params: InsightsParams,
  ): Promise<AccountInsights> {
    return this.getClient(platform).getAccountInsights(params);
  }

  async getCampaignInsights(
    platform: AdsPlatform,
    campaignId: string,
    params: InsightsParams,
  ): Promise<InsightsResult[]> {
    return this.getClient(platform).getCampaignInsights(campaignId, params);
  }

  async getAdSetInsights(
    platform: AdsPlatform,
    adSetId: string,
    params: InsightsParams,
  ): Promise<InsightsResult[]> {
    return this.getClient(platform).getAdSetInsights(adSetId, params);
  }

  async getAdInsights(
    platform: AdsPlatform,
    adId: string,
    params: InsightsParams,
  ): Promise<InsightsResult[]> {
    return this.getClient(platform).getAdInsights(adId, params);
  }

  async getInsights(
    platform: AdsPlatform,
    params: InsightsParams,
  ): Promise<InsightsResult[]> {
    return this.getClient(platform).getInsights(params);
  }

  // ============= CROSS-PLATFORM AGGREGATION =============
  async getAggregatedInsights(
    params: InsightsParams,
  ): Promise<{ platform: AdsPlatform; insights: AccountInsights }[]> {
    const results: { platform: AdsPlatform; insights: AccountInsights }[] = [];

    for (const [platform, client] of this.clients) {
      try {
        const insights = await client.getAccountInsights(params);
        results.push({ platform: platform as AdsPlatform, insights });
      } catch (error) {
        console.error(`Failed to get insights for ${platform}:`, error);
      }
    }

    return results;
  }

  async getAllCampaigns(): Promise<
    { platform: AdsPlatform; campaigns: Campaign[] }[]
  > {
    const results: { platform: AdsPlatform; campaigns: Campaign[] }[] = [];

    for (const [platform, client] of this.clients) {
      try {
        const campaigns = await client.getCampaigns();
        results.push({ platform: platform as AdsPlatform, campaigns });
      } catch (error) {
        console.error(`Failed to get campaigns for ${platform}:`, error);
      }
    }

    return results;
  }
}
