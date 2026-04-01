"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoogleCampaigns = exports.createGoogleCampaign = exports.getGoogleAdsAccounts = void 0;
const AdModels_1 = require("../../../Models/AdModels");
const encryption_1 = require("../../../Services/encryption");
const responseService_1 = require("../../../Services/responseService");
const GoogleAdsService_1 = require("../Services/GoogleAdsService");
const tokenService_1 = require("../../../Services/tokenService");
const ads_1 = require("../../../Types/ads");
const ads_oauth_1 = __importDefault(require("../Auth/ads-oauth"));
const utils_1 = require("../../../helpers/utils");
exports.getGoogleAdsAccounts = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const platform = req.params.platform;
        // Get the Google connection
        let connection = (await AdModels_1.AdsConModel.findOne({
            userId,
            platform,
        }));
        if (!connection) {
            return (0, responseService_1.resSender)(res, 400, "fail", "Google account not connected");
        }
        // Check if token needs refresh
        if ((0, tokenService_1.isOauthTokenExpired)(connection)) {
            try {
                console.log("Token expired, refreshing...");
                const refreshedConnection = await ads_oauth_1.default.refreshToken(connection);
                // console.log("Refershed connection: ", refreshedConnection);
                // console.log('New accessToken: ', decrypt(refreshedConnection.accessToken));
                // Update the connection with the refreshed token
                connection = refreshedConnection;
            }
            catch (err) {
                return {
                    success: false,
                    error: err.message || "Token refresh failed. Please re-authenticate.",
                    platform,
                };
            }
        }
        // Initialize Google Ads service
        const googleAdsService = new GoogleAdsService_1.GoogleAdsService((0, encryption_1.decrypt)(connection.accessToken));
        // Get accessible accounts
        const accessibleAccounts = await googleAdsService.getAccessibleAccountsWithDetails();
        return (0, responseService_1.resSender)(res, 200, "success", "Google Ads accounts retrieved", null, accessibleAccounts);
    }
    catch (error) {
        console.error("Error getting Google Ads accounts:", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error retrieving Google Ads accounts");
    }
});
exports.createGoogleCampaign = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { platform, campaignData } = req.body;
        const userId = req.user._id;
        // console.log('Got campaign req: ', { platform, campaignData});
        // Validate platform
        if (!Object.values(ads_1.AdsPlatform).includes(platform) ||
            !campaignData) {
            return (0, responseService_1.resSender)(res, 400, "fail", "Invalid request");
        }
        // Retrieve connection
        let connection = (await AdModels_1.AdsConModel.findOne({
            userId,
            platform,
        }));
        if (!connection) {
            return (0, responseService_1.resSender)(res, 400, "fail", "Platform not connected. Please authenticate first.");
        }
        // Refresh connection if expired
        if ((0, tokenService_1.isOauthTokenExpired)(connection)) {
            try {
                console.log("Token expired, refreshing...");
                const refreshedConnection = await ads_oauth_1.default.refreshToken(connection);
                // Update the connection with the refreshed token
                connection = refreshedConnection;
            }
            catch (err) {
                return {
                    success: false,
                    error: err.message || "Token refresh failed. Please re-authenticate.",
                    platform,
                };
            }
        }
        const googleAdsSer = new GoogleAdsService_1.GoogleAdsService((0, encryption_1.decrypt)(connection.accessToken));
        const customerAcc = await googleAdsSer.getAccessibleAccounts();
        const result = await googleAdsSer.createCampaign(customerAcc[1].customerId, campaignData);
        console.log("Cam Res: ", result);
        return (0, responseService_1.resSender)(res, 200, "success", "Success", result);
    }
    catch (error) {
        console.error("Error creating Google Ad:", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error creating Google Ads campaign");
    }
});
exports.getGoogleCampaigns = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { platform } = req.params;
        const userId = req.user._id;
        // console.log('Got campaign req: ', { platform});
        // Validate platform
        if (!Object.values(ads_1.AdsPlatform).includes(platform)) {
            return (0, responseService_1.resSender)(res, 400, "fail", "Invalid request");
        }
        // Retrieve connection
        let connection = (await AdModels_1.AdsConModel.findOne({
            userId,
            platform,
        }));
        if (!connection) {
            return (0, responseService_1.resSender)(res, 400, "fail", "Platform not connected. Please authenticate first.");
        }
        // Refresh connection if expired
        if ((0, tokenService_1.isOauthTokenExpired)(connection)) {
            try {
                console.log("Token expired, refreshing...");
                const refreshedConnection = await ads_oauth_1.default.refreshToken(connection);
                // Update the connection with the refreshed token
                connection = refreshedConnection;
            }
            catch (err) {
                return {
                    success: false,
                    error: err.message || "Token refresh failed. Please re-authenticate.",
                    platform,
                };
            }
        }
        const googleAdsSer = new GoogleAdsService_1.GoogleAdsService((0, encryption_1.decrypt)(connection.accessToken));
        const customerAcc = await googleAdsSer.getAccessibleAccounts();
        const result = await googleAdsSer.getGoogleCampaigns(customerAcc[1].customerId);
        console.log("Cam Res: ", result);
        return (0, responseService_1.resSender)(res, 200, "success", "Success", null, result);
    }
    catch (error) {
        console.error("Error fetching Google Campaigns:", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error fetching Google campaign");
    }
});
