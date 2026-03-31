// AdsController.ts - Complete implementation using AdManager

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
  CampaignCreateParams,
  CampaignUpdateParams,
  AdSetCreateParams,
  AdSetUpdateParams,
  AdCreateParams,
  AdUpdateParams,
  AdCreativeCreateParams,
  AudienceCreateParams,
  InsightsParams,
  AdAccount,
  Campaign,
  AdSet,
  Ad,
  AdCreative,
  Audience,
  InsightsResult,
  AccountInsights,
} from '../../../Types/ads';
import { isOauthTokenExpired } from '../../../Services/tokenService';
import adsOauth from '../Auth/ads-oauth';
import { asyncHandler } from '../../../helpers/utils';
import { CustomRequest } from '../../../Types/CustomRequest';
import Joi from 'joi';
import { modifyConnResponse } from '../../../Services/modifyUserResponse';

export class AdsController {
  private adManager: AdManager;

  constructor() {
    this.adManager = new AdManager();
  }

  private async getPlatformClient(platform: AdsPlatform, connection: AdsConnection): Promise<any> {
    const baseConfig = {
      accessToken: decrypt(connection.accessToken),
      adAccountId: connection.accountId,
      apiVersion: 'v23.0', // Default for Meta, others may override
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

  // ============= OAUTH METHODS =============
  public initiateOAuth = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const { error } = Joi.object({
        platform: Joi.string().required().valid(
          'meta',
          'google',
          'twitter',
          'snapchat',
          'linkedin',
          'tiktok',
          //   "pinterest"
        ),
      }).validate(req.params);
      if (error) return resSender(res, 400, 'fail', error.details[0].message);

      const { platform } = req.params;
      const orgId = req.organizationId?._id;
      req.headers['x-org-id'] || req.query.orgId;

      console.log('Got platform: ', platform);

      if (!Object.values(AdsPlatform).includes(platform as AdsPlatform)) {
        return resSender(res, 400, 'fail', 'Invalid platform');
      }

      const { url: authUrl, csrfState } = await adsOauth.generateAuthUrl(
        platform as AdsPlatform,
        orgId as string,
      );
      console.log('Ads AUth Url: ', authUrl);
      // res.json({ authUrl });
      res.cookie('csrfState', csrfState, { maxAge: 60000 });

      // return res.redirect(authUrl);

      return resSender(res, 200, 'success', 'Connect successful!', null, authUrl);
    } catch (error: any) {
      console.log('Error in Ads auth: ', error);
      return resSender(
        res,
        500,
        'error',
        error.message || 'Error occured while connecting to platform.',
      );
    }
  });

  public handleOAuthCallback = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      console.log('Ads Callback received');
      const { oauth_verifier, oauth_token, code, state } = req.query;

      let connection;
      let platform: AdsPlatform;

      // Determine the flow based on query parameters
      const isTwitterFlow =
        oauth_verifier && oauth_verifier !== 'null' && oauth_token && oauth_token !== 'null';
      console.log('Twitter flow detected?: ', isTwitterFlow);

      if (isTwitterFlow) {
        // Twitter OAuth 1.0a flow
        const retrievedState = adsOauth.getStateFromToken(oauth_token as string);
        if (!retrievedState) {
          return resSender(
            res,
            400,
            'fail',
            'Missing state',
            'Invalid or missing state for oauth_token',
          );
        }
        platform = adsOauth.parseState(retrievedState).platform;
        console.log('Handling Twitter OAuth 1.0a with oauth_verifier:', oauth_verifier);
        connection = await adsOauth.handleCallback(
          oauth_verifier as string,
          retrievedState,
          oauth_token as string,
          oauth_verifier as string,
        );
      } else if (code && state) {
        // OAuth 2.0 flow for other platforms
        platform = adsOauth.parseState(state as string).platform;
        console.log('Handling OAuth 2.0 with code:', code);
        connection = await adsOauth.handleCallback(code as string, state as string);
      } else {
        return resSender(
          res,
          400,
          'fail',
          'Parameters missing',
          'Missing required parameters (oauth_verifier/oauth_token or code/state)',
        );
      }

      return resSender(
        res,
        200,
        'success',
        'Connect Successful',
        null,
        // modifyConnResponse(connection),
      );
    } catch (error: any) {
      console.log('Error in Ads auth:', error);
      return resSender(
        res,
        500,
        'error',
        error.message || 'Error occurred while connecting to platform.',
      );
    }
  });

  public disconnectPlatform = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform } = req.params;
    const orgId = req.organizationId?._id as string;

    await AdsConModel.findOneAndDelete({
      orgId,
      platform,
    });

    return resSender(res, 200, 'success', `${platform} disconnected successfully`);
  });

  // ============= AD ACCOUNTS =============
  public getAdAccounts = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform } = req.params;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const accounts = await this.adManager.getAdAccounts(platformEnum);
    return resSender(res, 200, 'success', 'Accounts retrieved', null, accounts);
  });

  public getAdAccountDetails = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId } = req.params;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const account = await this.adManager.getAdAccount(platformEnum, accountId);
    return resSender(res, 200, 'success', 'Account details retrieved', null, account);
  });

  // ============= CAMPAIGNS =============
  public getCampaigns = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId } = req.params;
    const { status, limit } = req.query;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const params = {
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
    };

    const campaigns = await this.adManager.getCampaigns(platformEnum, params);
    return resSender(res, 200, 'success', 'Campaigns retrieved', null, campaigns);
  });

  public getCampaignDetails = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId, campaignId } = req.params;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const campaign = await this.adManager.getCampaign(platformEnum, campaignId);
    return resSender(res, 200, 'success', 'Campaign details retrieved', null, campaign);
  });

  public createCampaign = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId } = req.params;
    const { campaignData } = req.body as { campaignData: CampaignCreateParams };
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const campaign = await this.adManager.createCampaign(platformEnum, campaignData);
    return resSender(res, 201, 'success', 'Campaign created', null, campaign);
  });

  public updateCampaign = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId, campaignId } = req.params;
    const updateData: CampaignUpdateParams = req.body;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const campaign = await this.adManager.updateCampaign(platformEnum, campaignId, updateData);
    return resSender(res, 200, 'success', 'Campaign updated', null, campaign);
  });

  public deleteCampaign = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId, campaignId } = req.params;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const result = await this.adManager.deleteCampaign(platformEnum, campaignId);
    return resSender(res, 200, 'success', 'Campaign deleted', null, result);
  });

  public updateCampaignStatus = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId, campaignId } = req.params;
    const { status } = req.body;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const updateData: CampaignUpdateParams = { status };
    const campaign = await this.adManager.updateCampaign(platformEnum, campaignId, updateData);
    return resSender(res, 200, 'success', 'Campaign status updated', null, campaign);
  });

  // ============= AD SETS =============
  public getAdSets = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId, campaignId } = req.params;
    const { status, limit } = req.query;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const params = {
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
    };

    const adSets = await this.adManager.getAdSets(platformEnum, campaignId, params);
    return resSender(res, 200, 'success', 'Ad sets retrieved', null, adSets);
  });

  public getAdSetDetails = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId, campaignId, adSetId } = req.params;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const adSet = await this.adManager.getAdSet(platformEnum, adSetId);
    return resSender(res, 200, 'success', 'Ad set details retrieved', null, adSet);
  });

  public createAdSet = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId, campaignId } = req.params;
    const adSetData: AdSetCreateParams = req.body;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    // Ensure campaign_id is set from params
    adSetData.campaign_id = campaignId;

    const adSet = await this.adManager.createAdSet(platformEnum, adSetData);
    return resSender(res, 201, 'success', 'Ad set created', null, adSet);
  });

  public updateAdSet = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId, campaignId, adSetId } = req.params;
    const updateData: AdSetUpdateParams = req.body;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const adSet = await this.adManager.updateAdSet(platformEnum, adSetId, updateData);
    return resSender(res, 200, 'success', 'Ad set updated', null, adSet);
  });

  public deleteAdSet = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId, campaignId, adSetId } = req.params;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const result = await this.adManager.deleteAdSet(platformEnum, adSetId);
    return resSender(res, 200, 'success', 'Ad set deleted', null, result);
  });

  // ============= ADS =============
  public getAds = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId, adSetId } = req.params;
    const { status, limit } = req.query;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const params = {
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
    };

    const ads = await this.adManager.getAds(platformEnum, adSetId, params);
    return resSender(res, 200, 'success', 'Ads retrieved', null, ads);
  });

  public getAdDetails = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId, adSetId, adId } = req.params;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const ad = await this.adManager.getAd(platformEnum, adId);
    return resSender(res, 200, 'success', 'Ad details retrieved', null, ad);
  });

  public createAd = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId, adSetId } = req.params;
    const adData: AdCreateParams = req.body;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    // Ensure adset_id is set from params
    adData.adset_id = adSetId;

    const ad = await this.adManager.createAd(platformEnum, adData);
    return resSender(res, 201, 'success', 'Ad created', null, ad);
  });

  public updateAd = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId, adSetId, adId } = req.params;
    const updateData: AdUpdateParams = req.body;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const ad = await this.adManager.updateAd(platformEnum, adId, updateData);
    return resSender(res, 200, 'success', 'Ad updated', null, ad);
  });

  public deleteAd = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId, adSetId, adId } = req.params;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const result = await this.adManager.deleteAd(platformEnum, adId);
    return resSender(res, 200, 'success', 'Ad deleted', null, result);
  });

  // ============= CREATIVES =============
  public uploadCreative = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId } = req.params;
    const creativeData: AdCreativeCreateParams = req.body;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const creative = await this.adManager.createAdCreative(platformEnum, creativeData);
    return resSender(res, 201, 'success', 'Creative uploaded', null, creative);
  });

  public getCreatives = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId } = req.params;
    const { limit } = req.query;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const params = {
      limit: limit ? parseInt(limit as string) : undefined,
    };

    const creatives = await this.adManager.getCreatives(platformEnum, params);
    return resSender(res, 200, 'success', 'Creatives retrieved', null, creatives);
  });

  public deleteCreative = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId, creativeId } = req.params;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const result = await this.adManager.deleteCreative(platformEnum, creativeId);
    return resSender(res, 200, 'success', 'Creative deleted', null, result);
  });

  // ============= AUDIENCES =============
  public getAudiences = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId } = req.params;
    const { limit } = req.query;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const params = {
      limit: limit ? parseInt(limit as string) : undefined,
    };

    const audiences = await this.adManager.getAudiences(platformEnum, params);
    return resSender(res, 200, 'success', 'Audiences retrieved', null, audiences);
  });

  public createAudience = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform, accountId } = req.params;
    const audienceData: AudienceCreateParams = req.body;
    const orgId = req.organizationId?._id as string;

    const platformEnum = platform as AdsPlatform;
    const connection = await this.getConnection(orgId, platformEnum);
    await this.setupClient(platformEnum, connection);

    const audience = await this.adManager.createAudience(platformEnum, audienceData);
    return resSender(res, 201, 'success', 'Audience created', null, audience);
  });

  public getTargetingOptions = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { platform } = req.params;
    // This would typically be platform-specific and might not be in AdManager
    // You might need to implement this separately for each platform
    return resSender(res, 200, 'success', 'Targeting options retrieved', null, {
      message: 'This endpoint needs platform-specific implementation',
    });
  });
}

export const adsController = new AdsController();
