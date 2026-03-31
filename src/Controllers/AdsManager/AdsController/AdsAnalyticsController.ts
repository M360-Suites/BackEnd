// AdsAnalyticsController.ts - Complete implementation using AdManager

import { Response } from 'express';
import { resSender } from '../../../Services/responseService';
import { AdManager } from './AdManager';
import {
  MetaAdsClient,
  GoogleAdsClient,
  TwitterAdsClient,
  LinkedInAdsClient,
  TikTokAdsClient,
} from '../Clients';
import { AdsConModel } from '../../../Models/AdModels';
import { decrypt } from '../../../Services/encryption';
import {
  AdsPlatform,
  AdsConnection,
  InsightsParams,
  InsightsResult,
  AccountInsights,
} from '../../../Types/ads';
import { isOauthTokenExpired } from '../../../Services/tokenService';
import adsOauth from '../Auth/ads-oauth';
import { asyncHandler } from '../../../helpers/utils';
import { CustomRequest } from '../../../Types/CustomRequest';

export class AdsAnalyticsController {
  private adManager: AdManager;

  constructor() {
    this.adManager = new AdManager();
  }

  private async getPlatformClient(platform: AdsPlatform, connection: AdsConnection): Promise<any> {
    const baseConfig = {
      accessToken: decrypt(connection.accessToken),
      adAccountId: connection.accountId,
      apiVersion: 'v23.0',
    };

    const platformConfigs: Record<AdsPlatform, any> = {
      [AdsPlatform.META]: {
        ...baseConfig,
        apiVersion: 'v23.0',
      },
      [AdsPlatform.GOOGLE]: {
        ...baseConfig,
        developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        refreshToken: connection.refreshToken ? decrypt(connection.refreshToken) : '',
        loginCustomerId: process.env.GOOGLE_LOGIN_CUSTOMER_ID,
      },
      [AdsPlatform.TWITTER]: {
        ...baseConfig,
        consumerKey: process.env.TWITTER_CONSUMER_KEY!,
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET!,
        accessTokenSecret: connection.accessTokenSecret
          ? decrypt(connection.accessTokenSecret)
          : '',
        fundingInstrumentId: process.env.TWITTER_FUNDING_INSTRUMENT_ID,
      },
      [AdsPlatform.LINKEDIN]: {
        ...baseConfig,
        organizationId: process.env.LINKEDIN_ORGANIZATION_ID!,
      },
      [AdsPlatform.TIKTOK]: {
        ...baseConfig,
        pixelId: process.env.TIKTOK_PIXEL_ID,
        appId: process.env.TIKTOK_APP_ID,
      },
      [AdsPlatform.SNAPCHAT]: {
        ...baseConfig,
        organizationId: process.env.SNAPCHAT_ORGANIZATION_ID!,
      },
    };

    const config = platformConfigs[platform];
    if (!config) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    switch (platform) {
      case AdsPlatform.META:
        return new MetaAdsClient(config);
      case AdsPlatform.GOOGLE:
        return new GoogleAdsClient(config);
      case AdsPlatform.TWITTER:
        return new TwitterAdsClient(config);
      case AdsPlatform.LINKEDIN:
        return new LinkedInAdsClient(config);
      case AdsPlatform.TIKTOK:
        return new TikTokAdsClient(config);
      default:
        throw new Error(`Client not implemented for platform: ${platform}`);
    }
  }

  private async getConnection(orgId: string, platform: AdsPlatform): Promise<AdsConnection> {
    const connection = (await AdsConModel.findOne({
      orgId,
      platform,
    })) as AdsConnection;

    if (!connection) {
      throw new Error(`${platform} account not connected`);
    }

    return connection;
  }

  private async refreshConnectionIfNeeded(connection: AdsConnection): Promise<AdsConnection> {
    if (isOauthTokenExpired(connection)) {
      try {
        console.log('Token expired, refreshing...');
        return await adsOauth.refreshToken(connection);
      } catch (err: any) {
        throw new Error(err.message || 'Token refresh failed. Please re-authenticate.');
      }
    }
    return connection;
  }

  private async setupClient(platform: AdsPlatform, connection: AdsConnection): Promise<any> {
    const refreshedConnection = await this.refreshConnectionIfNeeded(connection);
    const client = await this.getPlatformClient(platform, refreshedConnection);
    this.adManager.registerClient(platform, client);
    return { client, connection: refreshedConnection };
  }

  private parseInsightsParams(req: CustomRequest): InsightsParams {
    const { date_preset, since, until, level, breakdowns, fields, filtering, sort, limit } =
      req.query;

    const params: InsightsParams = {};

    if (date_preset) {
      params.date_preset = date_preset as string;
    }

    if (since && until) {
      params.time_range = {
        since: since as string,
        until: until as string,
      };
    }

    if (level) {
      params.level = level as 'account' | 'campaign' | 'adset' | 'ad';
    }

    if (breakdowns) {
      params.breakdowns = Array.isArray(breakdowns)
        ? breakdowns.map((b) => b as string)
        : [breakdowns as string];
    }

    if (fields) {
      params.fields = Array.isArray(fields) ? fields.map((f) => f as string) : [fields as string];
    }

    if (filtering) {
      try {
        params.filtering = JSON.parse(filtering as string);
      } catch (e) {
        params.filtering = [];
      }
    }

    if (sort) {
      params.sort = Array.isArray(sort) ? sort.map((s) => s as string) : [sort as string];
    }

    if (limit) {
      params.limit = parseInt(limit as string, 10);
    }

    return params;
  }

  // ============= ACCOUNT ANALYTICS =============
  public getAccountOverview = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId } = req.params;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const params = this.parseInsightsParams(req);
    params.level = 'account';

    const insights = await this.adManager.getAccountInsights(platformEnum, params);
    return resSender(res, 200, 'success', 'Account overview retrieved', null, insights);
  });

  // ============= CAMPAIGN ANALYTICS =============
  public getCampaignInsights = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId } = req.params;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const params = this.parseInsightsParams(req);
    params.level = 'campaign';

    const insights = await this.adManager.getInsights(platformEnum, params);
    return resSender(res, 200, 'success', 'Campaign insights retrieved', null, insights);
  });

  public getCampaignDetails = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId, campaignId } = req.params;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const params = this.parseInsightsParams(req);

    const insights = await this.adManager.getCampaignInsights(platformEnum, campaignId, params);
    return resSender(res, 200, 'success', 'Campaign details retrieved', null, insights);
  });

  // ============= AD SET ANALYTICS =============
  public getAdSetInsights = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId, adSetId } = req.params;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const params = this.parseInsightsParams(req);

    const insights = await this.adManager.getAdSetInsights(platformEnum, adSetId, params);
    return resSender(res, 200, 'success', 'Ad set insights retrieved', null, insights);
  });

  // ============= AD ANALYTICS =============
  public getAdInsights = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId, adId } = req.params;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const params = this.parseInsightsParams(req);

    const insights = await this.adManager.getAdInsights(platformEnum, adId, params);
    return resSender(res, 200, 'success', 'Ad insights retrieved', null, insights);
  });

  // ============= TIME-BASED ANALYTICS =============
  public getDailyBreakdown = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId } = req.params;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const params = this.parseInsightsParams(req);
    params.breakdowns = ['daily']; // Ensure daily breakdown
    params.level = 'campaign'; // Can be adjusted based on needs

    const insights = await this.adManager.getInsights(platformEnum, params);

    // Group by date for daily breakdown
    const dailyBreakdown = insights.reduce((acc: any, insight) => {
      const date = insight.date_start || insight.date_stop;
      if (date) {
        if (!acc[date]) {
          acc[date] = {
            date,
            impressions: 0,
            clicks: 0,
            spend: 0,
            conversions: 0,
            campaign_count: 0,
          };
        }
        acc[date].impressions += insight.impressions || 0;
        acc[date].clicks += insight.clicks || 0;
        acc[date].spend += insight.spend || 0;
        acc[date].conversions += insight.conversions || 0;
        acc[date].campaign_count += 1;
      }
      return acc;
    }, {});

    const result = Object.values(dailyBreakdown).sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return resSender(res, 200, 'success', 'Daily breakdown retrieved', null, result);
  });

  // ============= DEMOGRAPHIC ANALYTICS =============
  public getDemographics = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId } = req.params;
    const { age, gender, location } = req.query;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const params = this.parseInsightsParams(req);

    // Add demographic breakdowns
    const breakdowns = ['age', 'gender'];
    if (location === 'true') {
      breakdowns.push('region');
    }
    params.breakdowns = breakdowns;

    const insights = await this.adManager.getInsights(platformEnum, params);

    // Process demographic data
    const demographics = {
      age_groups: {} as Record<string, any>,
      gender: {} as Record<string, any>,
      locations: {} as Record<string, any>,
    };

    insights.forEach((insight: any) => {
      // Process age groups
      if (insight.age) {
        if (!demographics.age_groups[insight.age]) {
          demographics.age_groups[insight.age] = {
            impressions: 0,
            clicks: 0,
            spend: 0,
            ctr: 0,
          };
        }
        demographics.age_groups[insight.age].impressions += insight.impressions || 0;
        demographics.age_groups[insight.age].clicks += insight.clicks || 0;
        demographics.age_groups[insight.age].spend += insight.spend || 0;
      }

      // Process gender
      if (insight.gender) {
        if (!demographics.gender[insight.gender]) {
          demographics.gender[insight.gender] = {
            impressions: 0,
            clicks: 0,
            spend: 0,
            ctr: 0,
          };
        }
        demographics.gender[insight.gender].impressions += insight.impressions || 0;
        demographics.gender[insight.gender].clicks += insight.clicks || 0;
        demographics.gender[insight.gender].spend += insight.spend || 0;
      }

      // Process locations
      if (insight.region) {
        if (!demographics.locations[insight.region]) {
          demographics.locations[insight.region] = {
            impressions: 0,
            clicks: 0,
            spend: 0,
            ctr: 0,
          };
        }
        demographics.locations[insight.region].impressions += insight.impressions || 0;
        demographics.locations[insight.region].clicks += insight.clicks || 0;
        demographics.locations[insight.region].spend += insight.spend || 0;
      }
    });

    // Calculate CTR for each group
    Object.keys(demographics.age_groups).forEach((age) => {
      const group = demographics.age_groups[age];
      group.ctr = group.impressions > 0 ? (group.clicks / group.impressions) * 100 : 0;
    });

    Object.keys(demographics.gender).forEach((gender) => {
      const group = demographics.gender[gender];
      group.ctr = group.impressions > 0 ? (group.clicks / group.impressions) * 100 : 0;
    });

    Object.keys(demographics.locations).forEach((location) => {
      const group = demographics.locations[location];
      group.ctr = group.impressions > 0 ? (group.clicks / group.impressions) * 100 : 0;
    });

    return resSender(res, 200, 'success', 'Demographic data retrieved', null, demographics);
  });

  // ============= PLACEMENT ANALYTICS =============
  public getPlacementBreakdown = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId } = req.params;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const params = this.parseInsightsParams(req);

    // Add placement breakdown (platform-specific)
    params.breakdowns = ['publisher_platform', 'platform_position'];
    if (platformEnum === AdsPlatform.META) {
      params.breakdowns.push('device_platform');
    }

    const insights = await this.adManager.getInsights(platformEnum, params);

    const placementBreakdown = insights.reduce((acc: any, insight: any) => {
      const platform = insight.publisher_platform || 'unknown';
      const position = insight.platform_position || 'unknown';
      const device = insight.device_platform || 'unknown';

      const key = `${platform}_${position}_${device}`;

      if (!acc[key]) {
        acc[key] = {
          platform,
          position,
          device,
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
        };
      }

      acc[key].impressions += insight.impressions || 0;
      acc[key].clicks += insight.clicks || 0;
      acc[key].spend += insight.spend || 0;
      acc[key].conversions += insight.conversions || 0;

      return acc;
    }, {});

    const result = Object.values(placementBreakdown).map((placement: any) => ({
      ...placement,
      ctr: placement.impressions > 0 ? (placement.clicks / placement.impressions) * 100 : 0,
      cpc: placement.clicks > 0 ? placement.spend / placement.clicks : 0,
      cpm: placement.impressions > 0 ? (placement.spend / placement.impressions) * 1000 : 0,
    }));

    return resSender(res, 200, 'success', 'Placement breakdown retrieved', null, result);
  });

  // ============= DEVICE ANALYTICS =============
  public getDeviceBreakdown = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId } = req.params;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const params = this.parseInsightsParams(req);
    params.breakdowns = ['device_platform'];

    const insights = await this.adManager.getInsights(platformEnum, params);

    const deviceBreakdown = insights.reduce((acc: any, insight: any) => {
      const device = insight.device_platform || 'unknown';

      if (!acc[device]) {
        acc[device] = {
          device,
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          campaigns: new Set(),
        };
      }

      acc[device].impressions += insight.impressions || 0;
      acc[device].clicks += insight.clicks || 0;
      acc[device].spend += insight.spend || 0;
      acc[device].conversions += insight.conversions || 0;

      if (insight.campaign_id) {
        acc[device].campaigns.add(insight.campaign_id);
      }

      return acc;
    }, {});

    const result = Object.values(deviceBreakdown).map((device: any) => ({
      device: device.device,
      impressions: device.impressions,
      clicks: device.clicks,
      spend: device.spend,
      conversions: device.conversions,
      campaign_count: device.campaigns.size,
      ctr: device.impressions > 0 ? (device.clicks / device.impressions) * 100 : 0,
      cpc: device.clicks > 0 ? device.spend / device.clicks : 0,
      cpm: device.impressions > 0 ? (device.spend / device.impressions) * 1000 : 0,
    }));

    return resSender(res, 200, 'success', 'Device breakdown retrieved', null, result);
  });

  // ============= CROSS-PLATFORM AGGREGATED ANALYTICS =============
  public getAggregatedOverview = asyncHandler(async (req: CustomRequest, res: Response) => {
    const orgId = req.organizationId?._id as string;

    // Get all connected platforms for the user
    const connections = await AdsConModel.find({ orgId });

    if (connections.length === 0) {
      return resSender(res, 404, 'fail', 'No ad platforms connected');
    }

    const params = this.parseInsightsParams(req);

    const aggregatedResults = [];

    for (const connection of connections) {
      try {
        const platformEnum = connection.platform as AdsPlatform;
        await this.setupClient(platformEnum, connection);

        const insights = await this.adManager.getAccountInsights(platformEnum, params);

        aggregatedResults.push({
          platform: platformEnum,
          account_name: connection.accountName,
          insights: insights.summary,
          date_range: insights.date_range,
        });
      } catch (error: any) {
        console.error(`Error getting insights for ${connection.platform}:`, error);
        aggregatedResults.push({
          platform: connection.platform,
          account_name: connection.accountName,
          error: error.message,
          insights: null,
        });
      }
    }

    // Calculate totals across all platforms
    const totals = aggregatedResults.reduce(
      (acc, result) => {
        if (result.insights) {
          acc.impressions += result.insights.impressions || 0;
          acc.clicks += result.insights.clicks || 0;
          acc.spend += result.insights.spend || 0;
          acc.conversions += result.insights.conversions || 0;
          acc.successful_platforms += 1;
        }
        return acc;
      },
      {
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        successful_platforms: 0,
      },
    ) as any;

    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    totals.cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    totals.cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;

    return resSender(res, 200, 'success', 'Aggregated overview retrieved', null, {
      platforms: aggregatedResults,
      totals,
      platform_count: aggregatedResults.length,
      successful_count: totals.successful_platforms,
    });
  });

  public getAggregatedCampaigns = asyncHandler(async (req: CustomRequest, res: Response) => {
    const orgId = req.organizationId?._id as string;

    const connections = await AdsConModel.find({ orgId });

    if (connections.length === 0) {
      return resSender(res, 404, 'fail', 'No ad platforms connected');
    }

    const params = this.parseInsightsParams(req);
    params.level = 'campaign';

    const allCampaigns: any[] = [];

    for (const connection of connections) {
      try {
        const platformEnum = connection.platform as AdsPlatform;
        await this.setupClient(platformEnum, connection);

        const insights = await this.adManager.getInsights(platformEnum, params);

        insights.forEach((insight: any) => {
          allCampaigns.push({
            platform: platformEnum,
            account_name: connection.accountName,
            ...insight,
          });
        });
      } catch (error: any) {
        console.error(`Error getting campaigns for ${connection.platform}:`, error);
      }
    }

    // Sort campaigns by spend (descending)
    const sortedCampaigns = allCampaigns.sort((a, b) => b.spend - a.spend);

    return resSender(res, 200, 'success', 'Aggregated campaigns retrieved', null, {
      campaigns: sortedCampaigns,
      total_campaigns: sortedCampaigns.length,
      total_spend: sortedCampaigns.reduce((sum, campaign) => sum + campaign.spend, 0),
      platform_count: connections.length,
    });
  });

  public getAggregatedPerformance = asyncHandler(async (req: CustomRequest, res: Response) => {
    const orgId = req.organizationId?._id as string;

    const connections = await AdsConModel.find({ orgId });

    if (connections.length === 0) {
      return resSender(res, 404, 'fail', 'No ad platforms connected');
    }

    const params = this.parseInsightsParams(req);

    const performanceByPlatform = [];

    for (const connection of connections) {
      try {
        const platformEnum = connection.platform as AdsPlatform;
        await this.setupClient(platformEnum, connection);

        const accountInsights = await this.adManager.getAccountInsights(platformEnum, params);
        const campaignInsights = await this.adManager.getInsights(platformEnum, {
          ...params,
          level: 'campaign',
          limit: 10, // Top 10 campaigns per platform
        });

        performanceByPlatform.push({
          platform: platformEnum,
          account_name: connection.accountName,
          summary: accountInsights.summary,
          top_campaigns: campaignInsights.slice(0, 5), // Top 5 campaigns
          campaign_count: campaignInsights.length,
          efficiency: {
            ctr: accountInsights.summary.ctr || 0,
            cpc: accountInsights.summary.cpc || 0,
            cpm: accountInsights.summary.cpm || 0,
            roas: accountInsights.summary.conversions
              ? accountInsights.summary.spend / accountInsights.summary.conversions
              : 0,
          },
        });
      } catch (error: any) {
        console.error(`Error getting performance for ${connection.platform}:`, error);
        performanceByPlatform.push({
          platform: connection.platform,
          account_name: connection.accountName,
          error: error.message,
          summary: null,
          top_campaigns: [],
        });
      }
    }

    // Calculate overall performance metrics
    const overallPerformance = performanceByPlatform.reduce(
      (acc, platform) => {
        if (platform.summary) {
          acc.total_impressions += platform.summary.impressions || 0;
          acc.total_clicks += platform.summary.clicks || 0;
          acc.total_spend += platform.summary.spend || 0;
          acc.total_conversions += platform.summary.conversions || 0;
          acc.successful_platforms += 1;
        }
        return acc;
      },
      {
        total_impressions: 0,
        total_clicks: 0,
        total_spend: 0,
        total_conversions: 0,
        successful_platforms: 0,
      },
    ) as any;

    overallPerformance.overall_ctr =
      overallPerformance.total_impressions > 0
        ? (overallPerformance.total_clicks / overallPerformance.total_impressions) * 100
        : 0;
    overallPerformance.overall_cpc =
      overallPerformance.total_clicks > 0
        ? overallPerformance.total_spend / overallPerformance.total_clicks
        : 0;
    overallPerformance.overall_cpm =
      overallPerformance.total_impressions > 0
        ? (overallPerformance.total_spend / overallPerformance.total_impressions) * 1000
        : 0;
    overallPerformance.overall_roas =
      overallPerformance.total_conversions > 0
        ? overallPerformance.total_spend / overallPerformance.total_conversions
        : 0;

    // Rank platforms by performance
    const rankedPlatforms = performanceByPlatform
      .filter((p) => p.summary)
      .sort((a, b) => (b.summary!.spend || 0) - (a.summary!.spend || 0))
      .map((platform, index) => ({
        rank: index + 1,
        ...platform,
      }));

    return resSender(res, 200, 'success', 'Aggregated performance retrieved', null, {
      platforms: rankedPlatforms,
      overall: overallPerformance,
      summary: {
        total_platforms: connections.length,
        active_platforms: performanceByPlatform.filter((p) => p.summary).length,
        best_performing: rankedPlatforms[0] || null,
        most_efficient:
          rankedPlatforms
            .filter((p) => p.efficiency)
            .sort((a, b) => (a.efficiency!.cpc || Infinity) - (b.efficiency!.cpc || Infinity))[0] ||
          null,
      },
    });
  });
}

export const analyticsController = new AdsAnalyticsController();
