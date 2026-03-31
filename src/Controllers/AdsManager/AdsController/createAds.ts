// createAds.ts - Updated and completed
import { Request, Response } from 'express';
import { resSender } from '../../../Services/responseService';
import { AdManager } from './AdManager';
import { MetaAdsClient } from '../Clients/MetaAdsClient';
import { GoogleAdsClient } from '../Clients/GoogleAdsClient';
import { TwitterAdsClient } from '../Clients/TwitterAdsClient';
import { LinkedInAdsClient } from '../Clients/LinkedInAdsClient';
import { TikTokAdsClient } from '../Clients/TikTokAdsClient';
import { AdsConModel } from '../../../Models/AdModels';
import { decrypt } from '../../../Services/encryption';
import { AdsPlatform } from '../../../Types/ads';
import { asyncHandler } from '../../../helpers/utils';

export const createAds = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { platform, campaignData, adSetData, creativeData, adData } = req.body;
    const userId = (req.user as any)._id;

    // Validate platform
    if (!Object.values(AdsPlatform).includes(platform as AdsPlatform)) {
      return resSender(res, 400, 'fail', 'Invalid platform');
    }

    // Get the connection details from database
    const connection = await AdsConModel.findOne({ userId, platform });
    if (!connection) {
      return resSender(res, 400, 'fail', 'Platform not connected. Please authenticate first.');
    }

    // Initialize the ad manager
    const adManager = new AdManager();

    // Create platform-specific client
    let client;
    const baseConfig = {
      accessToken: decrypt(connection.accessToken),
      adAccountId: connection.accountId,
      apiVersion: 'v23.0',
    };

    switch (platform) {
      case AdsPlatform.META:
        client = new MetaAdsClient(baseConfig);
        break;
      case AdsPlatform.GOOGLE:
        client = new GoogleAdsClient({
          ...baseConfig,
          developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          refreshToken: connection.refreshToken ? decrypt(connection.refreshToken) : '',
        });
        break;
      case AdsPlatform.TWITTER:
        client = new TwitterAdsClient({
          ...baseConfig,
          fundingInstrumentId: process.env.TWITTER_FUNDING_INSTRUMENT_ID!,
          consumerKey: process.env.TWITTER_FUNDING_INSTRUMENT_ID!,
          consumerSecret: process.env.TWITTER_FUNDING_INSTRUMENT_ID!,
          accessTokenSecret: process.env.TWITTER_FUNDING_INSTRUMENT_ID!,
        });
        break;
      case AdsPlatform.LINKEDIN:
        client = new LinkedInAdsClient({
          ...baseConfig,
          organizationId: process.env.LINKEDIN_ORGANIZATION_ID!,
        });
        break;
      case AdsPlatform.TIKTOK:
        client = new TikTokAdsClient({
          ...baseConfig,
          pixelId: process.env.TIKTOK_PIXEL_ID!,
        });
        break;
      default:
        return resSender(res, 400, 'fail', 'Unsupported platform');
    }

    // Register the client with the manager
    adManager.registerClient(platform, client);

    // Create the ad campaign
    let campaignResult;
    if (campaignData) {
      campaignResult = await adManager.createCampaign(platform, campaignData);
    }

    // Create the ad set (if provided)
    let adSetResult;
    if (adSetData && campaignResult) {
      adSetData.campaign_id = campaignResult.id || campaignResult.campaign_id;
      adSetResult = await adManager.createAdSet(platform, adSetData);
    }

    // Create the ad creative (if provided)
    let creativeResult;
    if (creativeData && adSetResult) {
      creativeData.adgroup_id = adSetResult.id || adSetResult.adgroup_id;
      creativeResult = await adManager.createAdCreative(platform, creativeData);
    }

    // Create the ad (if provided)
    let adResult;
    if (adData && creativeResult && adSetResult) {
      adData.adset_id = adSetResult.id || adSetResult.adset_id;
      adData.creative_id = creativeResult.id || creativeResult.creative_id;
      adResult = await adManager.createAd(platform, adData);
    }

    return resSender(res, 200, 'success', 'Ads created successfully', null, {
      campaign: campaignResult,
      adSet: adSetResult,
      creative: creativeResult,
      ad: adResult,
    });
  } catch (error: any) {
    console.log('Error creating ads: ', error);
    return resSender(res, 500, 'error', error.message || 'Error creating Ads');
  }
});
