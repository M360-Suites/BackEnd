// TikTokAdsClient.ts
import { AdPlatformClient } from "./AdPlatformClient";
import {
  TikTokAdsConfig,
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

export class TikTokAdsClient extends AdPlatformClient {
  protected platform = AdsPlatform.TIKTOK;
  protected baseUrl = "https://business-api.tiktok.com/open_api/v1.3";

  constructor(config: TikTokAdsConfig) {
    super(config);
  }

  private getUrl(endpoint: string): string {
    return `${this.baseUrl}/${endpoint}`;
  }

  private getHeaders() {
    return {
      "Access-Token": this.config.accessToken,
      "Content-Type": "application/json",
    };
  }

  // ============= AD ACCOUNTS =============
  async getAdAccounts(): Promise<AdAccount[]> {
    const response = await this.makeRequest<any>(
      "GET",
      this.getUrl("oauth2/advertiser/get/"),
      null,
      {
        headers: this.getHeaders(),
        params: { app_id: (this.config as TikTokAdsConfig).appId },
      },
    );

    return (response.data?.list || []).map((account: any) => ({
      id: account.advertiser_id,
      name: account.advertiser_name,
      currency: account.currency,
      timezone: account.timezone,
      status: account.status,
      platform: this.platform,
    }));
  }

  async getAdAccount(accountId: string): Promise<AdAccount> {
    const response = await this.makeRequest<any>(
      "GET",
      this.getUrl("advertiser/info/"),
      null,
      {
        headers: this.getHeaders(),
        params: { advertiser_ids: JSON.stringify([accountId]) },
      },
    );

    const account = response.data?.list?.[0] || {};
    return {
      id: account.advertiser_id,
      name: account.advertiser_name || account.name,
      currency: account.currency,
      timezone: account.timezone,
      status: account.status,
      platform: this.platform,
    };
  }

  // ============= CAMPAIGNS =============
  async getCampaigns(params?: {
    status?: string;
    limit?: number;
  }): Promise<Campaign[]> {
    const response = await this.makeRequest<any>(
      "GET",
      this.getUrl("campaign/get/"),
      null,
      {
        headers: this.getHeaders(),
        params: {
          advertiser_id: this.config.adAccountId,
          page_size: params?.limit || 100,
          ...(params?.status && {
            filtering: JSON.stringify({ status: [params.status] }),
          }),
        },
      },
    );

    return (response.data?.list || []).map((campaign: any) => ({
      id: campaign.campaign_id,
      name: campaign.campaign_name,
      objective: campaign.objective_type,
      status: campaign.status,
      daily_budget: campaign.budget ? parseFloat(campaign.budget) : undefined,
      lifetime_budget:
        campaign.budget_mode === "BUDGET_MODE_TOTAL"
          ? parseFloat(campaign.budget)
          : undefined,
    }));
  }

  async getCampaign(campaignId: string): Promise<Campaign> {
    const response = await this.makeRequest<any>(
      "GET",
      this.getUrl("campaign/get/"),
      null,
      {
        headers: this.getHeaders(),
        params: {
          advertiser_id: this.config.adAccountId,
          filtering: JSON.stringify({ campaign_ids: [campaignId] }),
        },
      },
    );

    const campaign = response.data?.list?.[0] || {};
    return {
      id: campaign.campaign_id,
      name: campaign.campaign_name,
      objective: campaign.objective_type,
      status: campaign.status,
      daily_budget:
        campaign.budget_mode === "BUDGET_MODE_DAY"
          ? parseFloat(campaign.budget)
          : undefined,
      lifetime_budget:
        campaign.budget_mode === "BUDGET_MODE_TOTAL"
          ? parseFloat(campaign.budget)
          : undefined,
    };
  }

  async createCampaign(params: CampaignCreateParams): Promise<Campaign> {
    const response = await this.makeRequest<any>(
      "POST",
      this.getUrl("campaign/create/"),
      {
        advertiser_id: this.config.adAccountId,
        campaign_name: params.name,
        objective_type: this.mapObjective(params.objective),
        budget_mode: params.daily_budget
          ? "BUDGET_MODE_DAY"
          : "BUDGET_MODE_TOTAL",
        budget: params.daily_budget || params.lifetime_budget || 0,
        operation_status: params.status === "ACTIVE" ? "ENABLE" : "DISABLE",
      },
      { headers: this.getHeaders() },
    );

    return { id: response.data?.campaign_id, ...params };
  }

  async updateCampaign(
    campaignId: string,
    params: CampaignUpdateParams,
  ): Promise<Campaign> {
    const body: any = {
      advertiser_id: this.config.adAccountId,
      campaign_id: campaignId,
    };

    if (params.name) body.campaign_name = params.name;
    if (params.status)
      body.operation_status = params.status === "ACTIVE" ? "ENABLE" : "DISABLE";
    if (params.daily_budget) {
      body.budget_mode = "BUDGET_MODE_DAY";
      body.budget = params.daily_budget;
    }
    if (params.lifetime_budget) {
      body.budget_mode = "BUDGET_MODE_TOTAL";
      body.budget = params.lifetime_budget;
    }

    await this.makeRequest<any>("POST", this.getUrl("campaign/update/"), body, {
      headers: this.getHeaders(),
    });

    return this.getCampaign(campaignId);
  }

  async deleteCampaign(campaignId: string): Promise<{ success: boolean }> {
    await this.makeRequest<any>(
      "POST",
      this.getUrl("campaign/update/status/"),
      {
        advertiser_id: this.config.adAccountId,
        campaign_ids: [campaignId],
        operation_status: "DELETE",
      },
      { headers: this.getHeaders() },
    );

    return { success: true };
  }

  private mapObjective(objective: string): string {
    const mapping: Record<string, string> = {
      AWARENESS: "REACH",
      TRAFFIC: "TRAFFIC",
      ENGAGEMENT: "VIDEO_VIEWS",
      LEADS: "LEAD_GENERATION",
      APP_PROMOTION: "APP_PROMOTION",
      SALES: "CONVERSIONS",
      VIDEO_VIEWS: "VIDEO_VIEWS",
      CONVERSIONS: "CONVERSIONS",
    };
    return mapping[objective] || "TRAFFIC";
  }

  // ============= AD GROUPS =============
  async getAdSets(
    campaignId?: string,
    params?: { status?: string; limit?: number },
  ): Promise<AdSet[]> {
    const filtering: any = {};
    if (campaignId) filtering.campaign_ids = [campaignId];
    if (params?.status) filtering.status = [params.status];

    const response = await this.makeRequest<any>(
      "GET",
      this.getUrl("adgroup/get/"),
      null,
      {
        headers: this.getHeaders(),
        params: {
          advertiser_id: this.config.adAccountId,
          page_size: params?.limit || 100,
          ...(Object.keys(filtering).length > 0 && {
            filtering: JSON.stringify(filtering),
          }),
        },
      },
    );

    return (response.data?.list || []).map((adgroup: any) => ({
      id: adgroup.adgroup_id,
      name: adgroup.adgroup_name,
      campaign_id: adgroup.campaign_id,
      status: adgroup.status,
      daily_budget:
        adgroup.budget_mode === "BUDGET_MODE_DAY"
          ? parseFloat(adgroup.budget)
          : undefined,
      lifetime_budget:
        adgroup.budget_mode === "BUDGET_MODE_TOTAL"
          ? parseFloat(adgroup.budget)
          : undefined,
      start_time: adgroup.schedule_start_time,
      end_time: adgroup.schedule_end_time,
      bid_amount: adgroup.bid_price ? parseFloat(adgroup.bid_price) : undefined,
      optimization_goal: adgroup.optimization_goal,
    }));
  }

  async getAdSet(adSetId: string): Promise<AdSet> {
    const response = await this.makeRequest<any>(
      "GET",
      this.getUrl("adgroup/get/"),
      null,
      {
        headers: this.getHeaders(),
        params: {
          advertiser_id: this.config.adAccountId,
          filtering: JSON.stringify({ adgroup_ids: [adSetId] }),
        },
      },
    );

    const adgroup = response.data?.list?.[0] || {};
    return {
      id: adgroup.adgroup_id,
      name: adgroup.adgroup_name,
      campaign_id: adgroup.campaign_id,
      status: adgroup.status,
      daily_budget:
        adgroup.budget_mode === "BUDGET_MODE_DAY"
          ? parseFloat(adgroup.budget)
          : undefined,
      lifetime_budget:
        adgroup.budget_mode === "BUDGET_MODE_TOTAL"
          ? parseFloat(adgroup.budget)
          : undefined,
      bid_amount: adgroup.bid_price ? parseFloat(adgroup.bid_price) : undefined,
      optimization_goal: adgroup.optimization_goal,
    };
  }

  async createAdSet(params: AdSetCreateParams): Promise<AdSet> {
    const response = await this.makeRequest<any>(
      "POST",
      this.getUrl("adgroup/create/"),
      {
        advertiser_id: this.config.adAccountId,
        campaign_id: params.campaign_id,
        adgroup_name: params.name,
        placement_type: "PLACEMENT_TYPE_AUTOMATIC",
        budget_mode: params.daily_budget
          ? "BUDGET_MODE_DAY"
          : "BUDGET_MODE_TOTAL",
        budget: params.daily_budget || params.lifetime_budget || 50,
        schedule_type: "SCHEDULE_START_END",
        schedule_start_time: params.start_time
          ? this.formatDateForApi(params.start_time)
          : new Date().toISOString(),
        ...(params.end_time && {
          schedule_end_time: this.formatDateForApi(params.end_time),
        }),
        optimization_goal: params.optimization_goal || "CLICK",
        billing_event: params.billing_event || "CPC",
        ...(params.bid_amount && { bid_price: params.bid_amount }),
        operation_status: params.status === "ACTIVE" ? "ENABLE" : "DISABLE",
        location_ids: ["6252001"], // US default
        gender: "GENDER_UNLIMITED",
        age_groups: [
          "AGE_18_24",
          "AGE_25_34",
          "AGE_35_44",
          "AGE_45_54",
          "AGE_55_100",
        ],
      },
      { headers: this.getHeaders() },
    );

    return { id: response.data?.adgroup_id, ...params };
  }

  async updateAdSet(
    adSetId: string,
    params: AdSetUpdateParams,
  ): Promise<AdSet> {
    const body: any = {
      advertiser_id: this.config.adAccountId,
      adgroup_id: adSetId,
    };

    if (params.name) body.adgroup_name = params.name;
    if (params.status)
      body.operation_status = params.status === "ACTIVE" ? "ENABLE" : "DISABLE";
    if (params.daily_budget) {
      body.budget_mode = "BUDGET_MODE_DAY";
      body.budget = params.daily_budget;
    }
    if (params.lifetime_budget) {
      body.budget_mode = "BUDGET_MODE_TOTAL";
      body.budget = params.lifetime_budget;
    }
    if (params.bid_amount) body.bid_price = params.bid_amount;
    if (params.end_time)
      body.schedule_end_time = this.formatDateForApi(params.end_time);

    await this.makeRequest<any>("POST", this.getUrl("adgroup/update/"), body, {
      headers: this.getHeaders(),
    });

    return this.getAdSet(adSetId);
  }

  async deleteAdSet(adSetId: string): Promise<{ success: boolean }> {
    await this.makeRequest<any>(
      "POST",
      this.getUrl("adgroup/update/status/"),
      {
        advertiser_id: this.config.adAccountId,
        adgroup_ids: [adSetId],
        operation_status: "DELETE",
      },
      { headers: this.getHeaders() },
    );

    return { success: true };
  }

  // ============= ADS =============
  async getAds(
    adSetId?: string,
    params?: { status?: string; limit?: number },
  ): Promise<Ad[]> {
    const filtering: any = {};
    if (adSetId) filtering.adgroup_ids = [adSetId];
    if (params?.status) filtering.status = [params.status];

    const response = await this.makeRequest<any>(
      "GET",
      this.getUrl("ad/get/"),
      null,
      {
        headers: this.getHeaders(),
        params: {
          advertiser_id: this.config.adAccountId,
          page_size: params?.limit || 100,
          ...(Object.keys(filtering).length > 0 && {
            filtering: JSON.stringify(filtering),
          }),
        },
      },
    );

    return (response.data?.list || []).map((ad: any) => ({
      id: ad.ad_id,
      name: ad.ad_name,
      adset_id: ad.adgroup_id,
      status: ad.status,
      creative_id: ad.creative_id,
    }));
  }

  async getAd(adId: string): Promise<Ad> {
    const response = await this.makeRequest<any>(
      "GET",
      this.getUrl("ad/get/"),
      null,
      {
        headers: this.getHeaders(),
        params: {
          advertiser_id: this.config.adAccountId,
          filtering: JSON.stringify({ ad_ids: [adId] }),
        },
      },
    );

    const ad = response.data?.list?.[0] || {};
    return {
      id: ad.ad_id,
      name: ad.ad_name,
      adset_id: ad.adgroup_id,
      status: ad.status,
      creative_id: ad.creative_id,
    };
  }

  async createAd(params: AdCreateParams): Promise<Ad> {
    const response = await this.makeRequest<any>(
      "POST",
      this.getUrl("ad/create/"),
      {
        advertiser_id: this.config.adAccountId,
        adgroup_id: params.adset_id,
        creatives: [
          {
            ad_name: params.name,
            ad_format: "SINGLE_VIDEO",
            ...(params.creative && {
              ad_text: params.creative.body,
              call_to_action:
                params.creative.call_to_action_type || "LEARN_MORE",
              landing_page_url: params.creative.link_url,
            }),
          },
        ],
      },
      { headers: this.getHeaders() },
    );

    return { id: response.data?.ad_ids?.[0], ...params };
  }

  async updateAd(adId: string, params: AdUpdateParams): Promise<Ad> {
    const body: any = {
      advertiser_id: this.config.adAccountId,
      ad_id: adId,
    };

    if (params.name) body.ad_name = params.name;
    if (params.status)
      body.operation_status = params.status === "ACTIVE" ? "ENABLE" : "DISABLE";

    await this.makeRequest<any>("POST", this.getUrl("ad/update/"), body, {
      headers: this.getHeaders(),
    });

    return this.getAd(adId);
  }

  async deleteAd(adId: string): Promise<{ success: boolean }> {
    await this.makeRequest<any>(
      "POST",
      this.getUrl("ad/update/status/"),
      {
        advertiser_id: this.config.adAccountId,
        ad_ids: [adId],
        operation_status: "DELETE",
      },
      { headers: this.getHeaders() },
    );

    return { success: true };
  }

  // ============= CREATIVES =============
  async getCreatives(params?: { limit?: number }): Promise<AdCreative[]> {
    const response = await this.makeRequest<any>(
      "GET",
      this.getUrl("creative/get/"),
      null,
      {
        headers: this.getHeaders(),
        params: {
          advertiser_id: this.config.adAccountId,
          page_size: params?.limit || 100,
        },
      },
    );

    return (response.data?.list || []).map((creative: any) => ({
      id: creative.creative_id,
      name: creative.creative_name,
      image_url: creative.image_url,
      video_id: creative.video_id,
    }));
  }

  async getCreative(creativeId: string): Promise<AdCreative> {
    const response = await this.makeRequest<any>(
      "GET",
      this.getUrl("creative/get/"),
      null,
      {
        headers: this.getHeaders(),
        params: {
          advertiser_id: this.config.adAccountId,
          filtering: JSON.stringify({ creative_ids: [creativeId] }),
        },
      },
    );

    const creative = response.data?.list?.[0] || {};
    return {
      id: creative.creative_id,
      name: creative.creative_name,
      image_url: creative.image_url,
      video_id: creative.video_id,
    };
  }

  async createCreative(params: AdCreativeCreateParams): Promise<AdCreative> {
    const response = await this.makeRequest<any>(
      "POST",
      this.getUrl("creative/create/"),
      {
        advertiser_id: this.config.adAccountId,
        creative_name: params.name,
        ...(params.video_id && { video_id: params.video_id }),
        ...(params.image_url && { image_ids: [params.image_url] }),
      },
      { headers: this.getHeaders() },
    );

    return { id: response.data?.creative_id, ...params };
  }

  async updateCreative(
    creativeId: string,
    params: Partial<AdCreativeCreateParams>,
  ): Promise<AdCreative> {
    const body: any = {
      advertiser_id: this.config.adAccountId,
      creative_id: creativeId,
    };

    if (params.name) body.creative_name = params.name;

    await this.makeRequest<any>("POST", this.getUrl("creative/update/"), body, {
      headers: this.getHeaders(),
    });

    return this.getCreative(creativeId);
  }

  async deleteCreative(creativeId: string): Promise<{ success: boolean }> {
    await this.makeRequest<any>(
      "POST",
      this.getUrl("creative/delete/"),
      {
        advertiser_id: this.config.adAccountId,
        creative_ids: [creativeId],
      },
      { headers: this.getHeaders() },
    );

    return { success: true };
  }

  // ============= AUDIENCES (Custom Audiences) =============
  async getAudiences(params?: { limit?: number }): Promise<Audience[]> {
    const response = await this.makeRequest<any>(
      "GET",
      this.getUrl("dmp/custom_audience/list/"),
      null,
      {
        headers: this.getHeaders(),
        params: {
          advertiser_id: this.config.adAccountId,
          page_size: params?.limit || 100,
        },
      },
    );

    return (response.data?.list || []).map((audience: any) => ({
      id: audience.custom_audience_id,
      name: audience.name,
      description: audience.name,
      subtype: audience.audience_type,
    }));
  }

  async getAudience(audienceId: string): Promise<Audience> {
    const response = await this.makeRequest<any>(
      "GET",
      this.getUrl("dmp/custom_audience/get/"),
      null,
      {
        headers: this.getHeaders(),
        params: {
          advertiser_id: this.config.adAccountId,
          custom_audience_ids: JSON.stringify([audienceId]),
        },
      },
    );

    const audience = response.data?.list?.[0] || {};
    return {
      id: audience.custom_audience_id,
      name: audience.name,
      subtype: audience.audience_type,
    };
  }

  async createAudience(params: AudienceCreateParams): Promise<Audience> {
    const response = await this.makeRequest<any>(
      "POST",
      this.getUrl("dmp/custom_audience/create/"),
      {
        advertiser_id: this.config.adAccountId,
        custom_audience_name: params.name,
        calculate_type: "INCLUDE",
        audience_type: params.subtype || "CUSTOMER_FILE",
      },
      { headers: this.getHeaders() },
    );

    return { id: response.data?.custom_audience_id, ...params };
  }

  async updateAudience(
    audienceId: string,
    params: Partial<AudienceCreateParams>,
  ): Promise<Audience> {
    const body: any = {
      advertiser_id: this.config.adAccountId,
      custom_audience_id: audienceId,
    };

    if (params.name) body.custom_audience_name = params.name;

    await this.makeRequest<any>(
      "POST",
      this.getUrl("dmp/custom_audience/update/"),
      body,
      { headers: this.getHeaders() },
    );

    return this.getAudience(audienceId);
  }

  async deleteAudience(audienceId: string): Promise<{ success: boolean }> {
    await this.makeRequest<any>(
      "POST",
      this.getUrl("dmp/custom_audience/delete/"),
      {
        advertiser_id: this.config.adAccountId,
        custom_audience_ids: [audienceId],
      },
      { headers: this.getHeaders() },
    );

    return { success: true };
  }

  // ============= ANALYTICS =============
  async getAccountInsights(params: InsightsParams): Promise<AccountInsights> {
    const dateRange = this.getDateRange(params);

    const response = await this.makeRequest<any>(
      "GET",
      this.getUrl("report/integrated/get/"),
      null,
      {
        headers: this.getHeaders(),
        params: {
          advertiser_id: this.config.adAccountId,
          service_type: "AUCTION",
          report_type: "BASIC",
          data_level: "AUCTION_ADVERTISER",
          dimensions: JSON.stringify(["advertiser_id"]),
          metrics: JSON.stringify([
            "spend",
            "impressions",
            "clicks",
            "reach",
            "cpc",
            "cpm",
            "ctr",
            "conversion",
          ]),
          start_date: dateRange.since,
          end_date: dateRange.until,
        },
      },
    );

    const data = response.data?.list?.[0]?.metrics || {};
    return {
      account_id: this.config.adAccountId,
      platform: this.platform,
      date_range: dateRange,
      summary: {
        impressions: parseInt(data.impressions || "0", 10),
        clicks: parseInt(data.clicks || "0", 10),
        spend: parseFloat(data.spend || "0"),
        reach: parseInt(data.reach || "0", 10),
        ctr: parseFloat(data.ctr || "0"),
        cpm: parseFloat(data.cpm || "0"),
        cpc: parseFloat(data.cpc || "0"),
        conversions: parseInt(data.conversion || "0", 10),
      },
    };
  }

  async getCampaignInsights(
    campaignId: string,
    params: InsightsParams,
  ): Promise<InsightsResult[]> {
    const dateRange = this.getDateRange(params);

    const response = await this.makeRequest<any>(
      "GET",
      this.getUrl("report/integrated/get/"),
      null,
      {
        headers: this.getHeaders(),
        params: {
          advertiser_id: this.config.adAccountId,
          service_type: "AUCTION",
          report_type: "BASIC",
          data_level: "AUCTION_CAMPAIGN",
          dimensions: JSON.stringify([
            "campaign_id",
            ...(params.breakdowns?.includes("day") ? ["stat_time_day"] : []),
          ]),
          metrics: JSON.stringify([
            "spend",
            "impressions",
            "clicks",
            "reach",
            "cpc",
            "cpm",
            "ctr",
            "conversion",
          ]),
          start_date: dateRange.since,
          end_date: dateRange.until,
          filtering: JSON.stringify([
            {
              field_name: "campaign_id",
              filter_type: "IN",
              filter_value: [campaignId],
            },
          ]),
        },
      },
    );

    return (response.data?.list || []).map((item: any) =>
      this.parseTikTokInsights(item, "campaign"),
    );
  }

  async getAdSetInsights(
    adSetId: string,
    params: InsightsParams,
  ): Promise<InsightsResult[]> {
    const dateRange = this.getDateRange(params);

    const response = await this.makeRequest<any>(
      "GET",
      this.getUrl("report/integrated/get/"),
      null,
      {
        headers: this.getHeaders(),
        params: {
          advertiser_id: this.config.adAccountId,
          service_type: "AUCTION",
          report_type: "BASIC",
          data_level: "AUCTION_ADGROUP",
          dimensions: JSON.stringify([
            "adgroup_id",
            ...(params.breakdowns?.includes("day") ? ["stat_time_day"] : []),
          ]),
          metrics: JSON.stringify([
            "spend",
            "impressions",
            "clicks",
            "reach",
            "cpc",
            "cpm",
            "ctr",
            "conversion",
          ]),
          start_date: dateRange.since,
          end_date: dateRange.until,
          filtering: JSON.stringify([
            {
              field_name: "adgroup_id",
              filter_type: "IN",
              filter_value: [adSetId],
            },
          ]),
        },
      },
    );

    return (response.data?.list || []).map((item: any) =>
      this.parseTikTokInsights(item, "adset"),
    );
  }

  async getAdInsights(
    adId: string,
    params: InsightsParams,
  ): Promise<InsightsResult[]> {
    const dateRange = this.getDateRange(params);

    const response = await this.makeRequest<any>(
      "GET",
      this.getUrl("report/integrated/get/"),
      null,
      {
        headers: this.getHeaders(),
        params: {
          advertiser_id: this.config.adAccountId,
          service_type: "AUCTION",
          report_type: "BASIC",
          data_level: "AUCTION_AD",
          dimensions: JSON.stringify([
            "ad_id",
            ...(params.breakdowns?.includes("day") ? ["stat_time_day"] : []),
          ]),
          metrics: JSON.stringify([
            "spend",
            "impressions",
            "clicks",
            "reach",
            "cpc",
            "cpm",
            "ctr",
            "conversion",
          ]),
          start_date: dateRange.since,
          end_date: dateRange.until,
          filtering: JSON.stringify([
            { field_name: "ad_id", filter_type: "IN", filter_value: [adId] },
          ]),
        },
      },
    );

    return (response.data?.list || []).map((item: any) =>
      this.parseTikTokInsights(item, "ad"),
    );
  }

  async getInsights(params: InsightsParams): Promise<InsightsResult[]> {
    const level = params.level || "campaign";
    const dateRange = this.getDateRange(params);

    let dataLevel: string;
    let dimension: string;
    switch (level) {
      case "adset":
        dataLevel = "AUCTION_ADGROUP";
        dimension = "adgroup_id";
        break;
      case "ad":
        dataLevel = "AUCTION_AD";
        dimension = "ad_id";
        break;
      default:
        dataLevel = "AUCTION_CAMPAIGN";
        dimension = "campaign_id";
    }

    const response = await this.makeRequest<any>(
      "GET",
      this.getUrl("report/integrated/get/"),
      null,
      {
        headers: this.getHeaders(),
        params: {
          advertiser_id: this.config.adAccountId,
          service_type: "AUCTION",
          report_type: "BASIC",
          data_level: dataLevel,
          dimensions: JSON.stringify([
            dimension,
            ...(params.breakdowns?.includes("day") ? ["stat_time_day"] : []),
          ]),
          metrics: JSON.stringify([
            "spend",
            "impressions",
            "clicks",
            "reach",
            "cpc",
            "cpm",
            "ctr",
            "conversion",
          ]),
          start_date: dateRange.since,
          end_date: dateRange.until,
          page_size: params.limit || 100,
        },
      },
    );

    return (response.data?.list || []).map((item: any) =>
      this.parseTikTokInsights(item, level),
    );
  }

  private parseTikTokInsights(item: any, level: string): InsightsResult {
    const dimensions = item.dimensions || {};
    const metrics = item.metrics || {};

    return {
      campaign_id: dimensions.campaign_id,
      adset_id: dimensions.adgroup_id,
      ad_id: dimensions.ad_id,
      date_start: dimensions.stat_time_day,
      date_stop: dimensions.stat_time_day,
      impressions: parseInt(metrics.impressions || "0", 10),
      clicks: parseInt(metrics.clicks || "0", 10),
      spend: parseFloat(metrics.spend || "0"),
      reach: parseInt(metrics.reach || "0", 10),
      ctr: parseFloat(metrics.ctr || "0"),
      cpm: parseFloat(metrics.cpm || "0"),
      cpc: parseFloat(metrics.cpc || "0"),
      conversions: parseInt(metrics.conversion || "0", 10),
    };
  }

  private getDateRange(params: InsightsParams): {
    since: string;
    until: string;
  } {
    if (params.time_range) {
      return params.time_range;
    }

    const today = new Date();
    const since = new Date(today);

    switch (params.date_preset) {
      case "today":
        break;
      case "yesterday":
        since.setDate(since.getDate() - 1);
        today.setDate(today.getDate() - 1);
        break;
      case "last_7d":
        since.setDate(since.getDate() - 7);
        break;
      case "last_30d":
      default:
        since.setDate(since.getDate() - 30);
        break;
    }

    return {
      since: since.toISOString().split("T")[0],
      until: today.toISOString().split("T")[0],
    };
  }
}