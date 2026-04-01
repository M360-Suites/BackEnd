"use strict";
// AdsController.ts - Complete implementation using AdManager
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adsController = exports.AdsController = void 0;
const responseService_1 = require("../../../Services/responseService");
const AdManager_1 = require("./AdManager");
const Clients_1 = require("../Clients");
const AdModels_1 = require("../../../Models/AdModels");
const encryption_1 = require("../../../Services/encryption");
const ads_1 = require("../../../Types/ads");
const tokenService_1 = require("../../../Services/tokenService");
const ads_oauth_1 = __importDefault(require("../Auth/ads-oauth"));
const utils_1 = require("../../../helpers/utils");
const joi_1 = __importDefault(require("joi"));
class AdsController {
    constructor() {
        // ============= OAUTH METHODS =============
        this.initiateOAuth = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                const { error } = joi_1.default.object({
                    platform: joi_1.default.string().required().valid('meta', 'google', 'twitter', 'snapchat', 'linkedin', 'tiktok'),
                }).validate(req.params);
                if (error)
                    return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
                const { platform } = req.params;
                const orgId = req.organizationId?._id;
                req.headers['x-org-id'] || req.query.orgId;
                console.log('Got platform: ', platform);
                if (!Object.values(ads_1.AdsPlatform).includes(platform)) {
                    return (0, responseService_1.resSender)(res, 400, 'fail', 'Invalid platform');
                }
                const { url: authUrl, csrfState } = await ads_oauth_1.default.generateAuthUrl(platform, orgId);
                console.log('Ads AUth Url: ', authUrl);
                // res.json({ authUrl });
                res.cookie('csrfState', csrfState, { maxAge: 60000 });
                // return res.redirect(authUrl);
                return (0, responseService_1.resSender)(res, 200, 'success', 'Connect successful!', null, authUrl);
            }
            catch (error) {
                console.log('Error in Ads auth: ', error);
                return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Error occured while connecting to platform.');
            }
        });
        this.handleOAuthCallback = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                console.log('Ads Callback received');
                const { oauth_verifier, oauth_token, code, state } = req.query;
                let connection;
                let platform;
                // Determine the flow based on query parameters
                const isTwitterFlow = oauth_verifier && oauth_verifier !== 'null' && oauth_token && oauth_token !== 'null';
                console.log('Twitter flow detected?: ', isTwitterFlow);
                if (isTwitterFlow) {
                    // Twitter OAuth 1.0a flow
                    const retrievedState = ads_oauth_1.default.getStateFromToken(oauth_token);
                    if (!retrievedState) {
                        return (0, responseService_1.resSender)(res, 400, 'fail', 'Missing state', 'Invalid or missing state for oauth_token');
                    }
                    platform = ads_oauth_1.default.parseState(retrievedState).platform;
                    console.log('Handling Twitter OAuth 1.0a with oauth_verifier:', oauth_verifier);
                    connection = await ads_oauth_1.default.handleCallback(oauth_verifier, retrievedState, oauth_token, oauth_verifier);
                }
                else if (code && state) {
                    // OAuth 2.0 flow for other platforms
                    platform = ads_oauth_1.default.parseState(state).platform;
                    console.log('Handling OAuth 2.0 with code:', code);
                    connection = await ads_oauth_1.default.handleCallback(code, state);
                }
                else {
                    return (0, responseService_1.resSender)(res, 400, 'fail', 'Parameters missing', 'Missing required parameters (oauth_verifier/oauth_token or code/state)');
                }
                return (0, responseService_1.resSender)(res, 200, 'success', 'Connect Successful', null);
            }
            catch (error) {
                console.log('Error in Ads auth:', error);
                return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Error occurred while connecting to platform.');
            }
        });
        this.disconnectPlatform = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform } = req.params;
            const orgId = req.organizationId?._id;
            await AdModels_1.AdsConModel.findOneAndDelete({
                orgId,
                platform,
            });
            return (0, responseService_1.resSender)(res, 200, 'success', `${platform} disconnected successfully`);
        });
        // ============= AD ACCOUNTS =============
        this.getAdAccounts = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform } = req.params;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const accounts = await this.adManager.getAdAccounts(platformEnum);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Accounts retrieved', null, accounts);
        });
        this.getAdAccountDetails = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId } = req.params;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const account = await this.adManager.getAdAccount(platformEnum, accountId);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Account details retrieved', null, account);
        });
        // ============= CAMPAIGNS =============
        this.getCampaigns = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId } = req.params;
            const { status, limit } = req.query;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const params = {
                status: status,
                limit: limit ? parseInt(limit) : undefined,
            };
            const campaigns = await this.adManager.getCampaigns(platformEnum, params);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Campaigns retrieved', null, campaigns);
        });
        this.getCampaignDetails = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId, campaignId } = req.params;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const campaign = await this.adManager.getCampaign(platformEnum, campaignId);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Campaign details retrieved', null, campaign);
        });
        this.createCampaign = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId } = req.params;
            const { campaignData } = req.body;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const campaign = await this.adManager.createCampaign(platformEnum, campaignData);
            return (0, responseService_1.resSender)(res, 201, 'success', 'Campaign created', null, campaign);
        });
        this.updateCampaign = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId, campaignId } = req.params;
            const updateData = req.body;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const campaign = await this.adManager.updateCampaign(platformEnum, campaignId, updateData);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Campaign updated', null, campaign);
        });
        this.deleteCampaign = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId, campaignId } = req.params;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const result = await this.adManager.deleteCampaign(platformEnum, campaignId);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Campaign deleted', null, result);
        });
        this.updateCampaignStatus = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId, campaignId } = req.params;
            const { status } = req.body;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const updateData = { status };
            const campaign = await this.adManager.updateCampaign(platformEnum, campaignId, updateData);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Campaign status updated', null, campaign);
        });
        // ============= AD SETS =============
        this.getAdSets = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId, campaignId } = req.params;
            const { status, limit } = req.query;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const params = {
                status: status,
                limit: limit ? parseInt(limit) : undefined,
            };
            const adSets = await this.adManager.getAdSets(platformEnum, campaignId, params);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Ad sets retrieved', null, adSets);
        });
        this.getAdSetDetails = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId, campaignId, adSetId } = req.params;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const adSet = await this.adManager.getAdSet(platformEnum, adSetId);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Ad set details retrieved', null, adSet);
        });
        this.createAdSet = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId, campaignId } = req.params;
            const adSetData = req.body;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            // Ensure campaign_id is set from params
            adSetData.campaign_id = campaignId;
            const adSet = await this.adManager.createAdSet(platformEnum, adSetData);
            return (0, responseService_1.resSender)(res, 201, 'success', 'Ad set created', null, adSet);
        });
        this.updateAdSet = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId, campaignId, adSetId } = req.params;
            const updateData = req.body;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const adSet = await this.adManager.updateAdSet(platformEnum, adSetId, updateData);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Ad set updated', null, adSet);
        });
        this.deleteAdSet = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId, campaignId, adSetId } = req.params;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const result = await this.adManager.deleteAdSet(platformEnum, adSetId);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Ad set deleted', null, result);
        });
        // ============= ADS =============
        this.getAds = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId, adSetId } = req.params;
            const { status, limit } = req.query;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const params = {
                status: status,
                limit: limit ? parseInt(limit) : undefined,
            };
            const ads = await this.adManager.getAds(platformEnum, adSetId, params);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Ads retrieved', null, ads);
        });
        this.getAdDetails = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId, adSetId, adId } = req.params;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const ad = await this.adManager.getAd(platformEnum, adId);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Ad details retrieved', null, ad);
        });
        this.createAd = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId, adSetId } = req.params;
            const adData = req.body;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            // Ensure adset_id is set from params
            adData.adset_id = adSetId;
            const ad = await this.adManager.createAd(platformEnum, adData);
            return (0, responseService_1.resSender)(res, 201, 'success', 'Ad created', null, ad);
        });
        this.updateAd = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId, adSetId, adId } = req.params;
            const updateData = req.body;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const ad = await this.adManager.updateAd(platformEnum, adId, updateData);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Ad updated', null, ad);
        });
        this.deleteAd = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId, adSetId, adId } = req.params;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const result = await this.adManager.deleteAd(platformEnum, adId);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Ad deleted', null, result);
        });
        // ============= CREATIVES =============
        this.uploadCreative = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId } = req.params;
            const creativeData = req.body;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const creative = await this.adManager.createAdCreative(platformEnum, creativeData);
            return (0, responseService_1.resSender)(res, 201, 'success', 'Creative uploaded', null, creative);
        });
        this.getCreatives = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId } = req.params;
            const { limit } = req.query;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const params = {
                limit: limit ? parseInt(limit) : undefined,
            };
            const creatives = await this.adManager.getCreatives(platformEnum, params);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Creatives retrieved', null, creatives);
        });
        this.deleteCreative = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId, creativeId } = req.params;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const result = await this.adManager.deleteCreative(platformEnum, creativeId);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Creative deleted', null, result);
        });
        // ============= AUDIENCES =============
        this.getAudiences = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId } = req.params;
            const { limit } = req.query;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const params = {
                limit: limit ? parseInt(limit) : undefined,
            };
            const audiences = await this.adManager.getAudiences(platformEnum, params);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Audiences retrieved', null, audiences);
        });
        this.createAudience = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform, accountId } = req.params;
            const audienceData = req.body;
            const orgId = req.organizationId?._id;
            const platformEnum = platform;
            const connection = await this.getConnection(orgId, platformEnum);
            await this.setupClient(platformEnum, connection);
            const audience = await this.adManager.createAudience(platformEnum, audienceData);
            return (0, responseService_1.resSender)(res, 201, 'success', 'Audience created', null, audience);
        });
        this.getTargetingOptions = (0, utils_1.asyncHandler)(async (req, res) => {
            const { platform } = req.params;
            // This would typically be platform-specific and might not be in AdManager
            // You might need to implement this separately for each platform
            return (0, responseService_1.resSender)(res, 200, 'success', 'Targeting options retrieved', null, {
                message: 'This endpoint needs platform-specific implementation',
            });
        });
        this.adManager = new AdManager_1.AdManager();
    }
    async getPlatformClient(platform, connection) {
        const baseConfig = {
            accessToken: (0, encryption_1.decrypt)(connection.accessToken),
            adAccountId: connection.accountId,
            apiVersion: 'v23.0', // Default for Meta, others may override
        };
        const platformConfigs = {
            [ads_1.AdsPlatform.META]: {
                ...baseConfig,
                apiVersion: 'v23.0',
            },
            [ads_1.AdsPlatform.GOOGLE]: {
                ...baseConfig,
                developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                refreshToken: connection.refreshToken ? (0, encryption_1.decrypt)(connection.refreshToken) : '',
                loginCustomerId: process.env.GOOGLE_LOGIN_CUSTOMER_ID,
            },
            [ads_1.AdsPlatform.TWITTER]: {
                ...baseConfig,
                consumerKey: process.env.TWITTER_CONSUMER_KEY,
                consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
                accessTokenSecret: connection.accessTokenSecret
                    ? (0, encryption_1.decrypt)(connection.accessTokenSecret)
                    : '',
                fundingInstrumentId: process.env.TWITTER_FUNDING_INSTRUMENT_ID,
            },
            [ads_1.AdsPlatform.LINKEDIN]: {
                ...baseConfig,
                organizationId: process.env.LINKEDIN_ORGANIZATION_ID,
            },
            [ads_1.AdsPlatform.TIKTOK]: {
                ...baseConfig,
                pixelId: process.env.TIKTOK_PIXEL_ID,
                appId: process.env.TIKTOK_APP_ID,
            },
            [ads_1.AdsPlatform.SNAPCHAT]: {
                ...baseConfig,
                organizationId: process.env.SNAPCHAT_ORGANIZATION_ID,
            },
        };
        const config = platformConfigs[platform];
        if (!config) {
            throw new Error(`Unsupported platform: ${platform}`);
        }
        switch (platform) {
            case ads_1.AdsPlatform.META:
                return new Clients_1.MetaAdsClient(config);
            case ads_1.AdsPlatform.GOOGLE:
                return new Clients_1.GoogleAdsClient(config);
            case ads_1.AdsPlatform.TWITTER:
                return new Clients_1.TwitterAdsClient(config);
            case ads_1.AdsPlatform.LINKEDIN:
                return new Clients_1.LinkedInAdsClient(config);
            case ads_1.AdsPlatform.TIKTOK:
                return new Clients_1.TikTokAdsClient(config);
            default:
                throw new Error(`Client not implemented for platform: ${platform}`);
        }
    }
    async getConnection(orgId, platform) {
        const connection = (await AdModels_1.AdsConModel.findOne({
            orgId,
            platform,
        }));
        if (!connection) {
            throw new Error(`${platform} account not connected`);
        }
        return connection;
    }
    async refreshConnectionIfNeeded(connection) {
        if ((0, tokenService_1.isOauthTokenExpired)(connection)) {
            try {
                console.log('Token expired, refreshing...');
                return await ads_oauth_1.default.refreshToken(connection);
            }
            catch (err) {
                throw new Error(err.message || 'Token refresh failed. Please re-authenticate.');
            }
        }
        return connection;
    }
    async setupClient(platform, connection) {
        const refreshedConnection = await this.refreshConnectionIfNeeded(connection);
        const client = await this.getPlatformClient(platform, refreshedConnection);
        this.adManager.registerClient(platform, client);
        return { client, connection: refreshedConnection };
    }
}
exports.AdsController = AdsController;
exports.adsController = new AdsController();
