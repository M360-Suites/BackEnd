"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAds = void 0;
const responseService_1 = require("../../../Services/responseService");
const AdManager_1 = require("./AdManager");
const MetaAdsClient_1 = require("../Clients/MetaAdsClient");
const GoogleAdsClient_1 = require("../Clients/GoogleAdsClient");
const TwitterAdsClient_1 = require("../Clients/TwitterAdsClient");
const LinkedInAdsClient_1 = require("../Clients/LinkedInAdsClient");
const TikTokAdsClient_1 = require("../Clients/TikTokAdsClient");
const AdModels_1 = require("../../../Models/AdModels");
const encryption_1 = require("../../../Services/encryption");
const ads_1 = require("../../../Types/ads");
const utils_1 = require("../../../helpers/utils");
exports.createAds = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { platform, campaignData, adSetData, creativeData, adData } = req.body;
        const userId = req.user._id;
        // Validate platform
        if (!Object.values(ads_1.AdsPlatform).includes(platform)) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Invalid platform');
        }
        // Get the connection details from database
        const connection = await AdModels_1.AdsConModel.findOne({ userId, platform });
        if (!connection) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Platform not connected. Please authenticate first.');
        }
        // Initialize the ad manager
        const adManager = new AdManager_1.AdManager();
        // Create platform-specific client
        let client;
        const baseConfig = {
            accessToken: (0, encryption_1.decrypt)(connection.accessToken),
            adAccountId: connection.accountId,
            apiVersion: 'v23.0',
        };
        switch (platform) {
            case ads_1.AdsPlatform.META:
                client = new MetaAdsClient_1.MetaAdsClient(baseConfig);
                break;
            case ads_1.AdsPlatform.GOOGLE:
                client = new GoogleAdsClient_1.GoogleAdsClient({
                    ...baseConfig,
                    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    refreshToken: connection.refreshToken ? (0, encryption_1.decrypt)(connection.refreshToken) : '',
                });
                break;
            case ads_1.AdsPlatform.TWITTER:
                client = new TwitterAdsClient_1.TwitterAdsClient({
                    ...baseConfig,
                    fundingInstrumentId: process.env.TWITTER_FUNDING_INSTRUMENT_ID,
                    consumerKey: process.env.TWITTER_FUNDING_INSTRUMENT_ID,
                    consumerSecret: process.env.TWITTER_FUNDING_INSTRUMENT_ID,
                    accessTokenSecret: process.env.TWITTER_FUNDING_INSTRUMENT_ID,
                });
                break;
            case ads_1.AdsPlatform.LINKEDIN:
                client = new LinkedInAdsClient_1.LinkedInAdsClient({
                    ...baseConfig,
                    organizationId: process.env.LINKEDIN_ORGANIZATION_ID,
                });
                break;
            case ads_1.AdsPlatform.TIKTOK:
                client = new TikTokAdsClient_1.TikTokAdsClient({
                    ...baseConfig,
                    pixelId: process.env.TIKTOK_PIXEL_ID,
                });
                break;
            default:
                return (0, responseService_1.resSender)(res, 400, 'fail', 'Unsupported platform');
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
        return (0, responseService_1.resSender)(res, 200, 'success', 'Ads created successfully', null, {
            campaign: campaignResult,
            adSet: adSetResult,
            creative: creativeResult,
            ad: adResult,
        });
    }
    catch (error) {
        console.log('Error creating ads: ', error);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Error creating Ads');
    }
});
