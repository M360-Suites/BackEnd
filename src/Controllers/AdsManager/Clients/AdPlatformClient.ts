// src/AdPlatformClient.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import {
  AdPlatformConfig,
  AdAccount,
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
  AdsPlatform,
} from "../../../Types/ads";


export abstract class AdPlatformClient {
  protected httpClient: AxiosInstance;
  protected config: AdPlatformConfig;
  protected abstract platform: AdsPlatform;
  protected abstract baseUrl: string;

  constructor(config: AdPlatformConfig) {
    this.config = config;
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => this.handleApiError(error),
    );
  }

  protected async makeRequest<T = any>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.httpClient.request({
      method,
      url,
      data,
      ...config,
    });
    return response.data;
  }

  protected handleApiError(error: any): never {
    if (error.response) {
      const { status, data } = error.response;
      const message =
        data?.error?.message || data?.message || "API request failed";
      throw new Error(`${this.platform} API Error (${status}): ${message}`);
    } else if (error.request) {
      throw new Error(`${this.platform} API Error: No response received`);
    } else {
      throw new Error(`${this.platform} API Error: ${error.message}`);
    }
  }


  // ============= AD ACCOUNTS =============
  abstract getAdAccounts(): Promise<AdAccount[]>;
  abstract getAdAccount(accountId: string): Promise<AdAccount>;

  // ============= CAMPAIGNS =============
  abstract getCampaigns(params?: { status?: string; limit?: number }): Promise<Campaign[]>;
  abstract getCampaign(campaignId: string): Promise<Campaign>;
  abstract createCampaign(params: CampaignCreateParams): Promise<Campaign>;
  abstract updateCampaign(campaignId: string, params: CampaignUpdateParams): Promise<Campaign>;
  abstract deleteCampaign(campaignId: string): Promise<{ success: boolean }>;

  // ============= AD SETS / AD GROUPS =============
  abstract getAdSets(campaignId?: string, params?: { status?: string; limit?: number }): Promise<AdSet[]>;
  abstract getAdSet(adSetId: string): Promise<AdSet>;
  abstract createAdSet(params: AdSetCreateParams): Promise<AdSet>;
  abstract updateAdSet(adSetId: string, params: AdSetUpdateParams): Promise<AdSet>;
  abstract deleteAdSet(adSetId: string): Promise<{ success: boolean }>;

  // ============= ADS =============
  abstract getAds(adSetId?: string, params?: { status?: string; limit?: number }): Promise<Ad[]>;
  abstract getAd(adId: string): Promise<Ad>;
  abstract createAd(params: AdCreateParams): Promise<Ad>;
  abstract updateAd(adId: string, params: AdUpdateParams): Promise<Ad>;
  abstract deleteAd(adId: string): Promise<{ success: boolean }>;

  // ============= CREATIVES =============
  abstract getCreatives(params?: { limit?: number }): Promise<AdCreative[]>;
  abstract getCreative(creativeId: string): Promise<AdCreative>;
  abstract createCreative(params: AdCreativeCreateParams): Promise<AdCreative>;
  abstract updateCreative(creativeId: string, params: Partial<AdCreativeCreateParams>): Promise<AdCreative>;
  abstract deleteCreative(creativeId: string): Promise<{ success: boolean }>;

  // ============= AUDIENCES =============
  abstract getAudiences(params?: { limit?: number }): Promise<Audience[]>;
  abstract getAudience(audienceId: string): Promise<Audience>;
  abstract createAudience(params: AudienceCreateParams): Promise<Audience>;
  abstract updateAudience(audienceId: string, params: Partial<AudienceCreateParams>): Promise<Audience>;
  abstract deleteAudience(audienceId: string): Promise<{ success: boolean }>;

  // ============= INSIGHTS / ANALYTICS =============
  abstract getAccountInsights(params: InsightsParams): Promise<AccountInsights>;
  abstract getCampaignInsights(campaignId: string, params: InsightsParams): Promise<InsightsResult[]>;
  abstract getAdSetInsights(adSetId: string, params: InsightsParams): Promise<InsightsResult[]>;
  abstract getAdInsights(adId: string, params: InsightsParams): Promise<InsightsResult[]>;
  abstract getInsights(params: InsightsParams): Promise<InsightsResult[]>;

  // ============= HELPER METHODS =============
  protected formatDateForApi(date: string | Date): string {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return date;
  }

  protected parseInsightsResponse(data: any): InsightsResult {
    return {
      date_start: data.date_start || data.start_date || data.dateStart,
      date_stop: data.date_stop || data.end_date || data.dateEnd,
      account_id: data.account_id || data.accountId,
      campaign_id: data.campaign_id || data.campaignId,
      campaign_name: data.campaign_name || data.campaignName,
      adset_id: data.adset_id || data.adgroupId || data.adsetId,
      adset_name: data.adset_name || data.adgroupName || data.adsetName,
      ad_id: data.ad_id || data.adId,
      ad_name: data.ad_name || data.adName,
      impressions: parseInt(data.impressions || data.impression || '0', 10),
      clicks: parseInt(data.clicks || data.click || '0', 10),
      spend: parseFloat(data.spend || data.cost || data.totalSpend || '0'),
      reach: parseInt(data.reach || '0', 10),
      frequency: parseFloat(data.frequency || '0'),
      cpm: parseFloat(data.cpm || data.costPerMille || '0'),
      cpc: parseFloat(data.cpc || data.costPerClick || '0'),
      ctr: parseFloat(data.ctr || data.clickThroughRate || '0'),
      conversions: parseInt(data.conversions || data.conversion || '0', 10),
      actions: data.actions || [],
      video_views: parseInt(data.video_views || data.videoViews || '0', 10),
    };
  }
}
