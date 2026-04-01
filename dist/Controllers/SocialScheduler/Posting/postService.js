"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postToMultiplePlatforms = exports.post = void 0;
const SocialModels_1 = require("../../../Models/SocialModels");
const oauth_service_1 = __importDefault(require("../Auth/oauth-service"));
const types_1 = require("../../../Types/types");
const facebookPoster_1 = require("./facebookPoster");
const instaPoster_1 = require("./instaPoster");
const linkedInPoster_1 = require("./linkedInPoster");
const pinterestPoster_1 = require("./pinterestPoster");
const tiktokPoster_1 = require("./tiktokPoster");
const twitterPoster_1 = require("./twitterPoster");
const youtubePoster_1 = require("./youtubePoster");
const tokenService_1 = require("../../../Services/tokenService");
const post = async (orgId, platform, content) => {
    try {
        let connection = (await SocialModels_1.SocialConnectionModel.findOne({
            orgId,
            platform,
        }));
        if (!connection)
            throw new Error(`No authentication found for platform '${platform}'`);
        // console.log('Initial connection: ', connection);
        // console.log('Access token: ', decrypt(connection.accessToken));
        // Check if token needs refresh
        if ((0, tokenService_1.isOauthTokenExpired)(connection)) {
            try {
                console.log('Token expired, refreshing...');
                const refreshedConnection = await oauth_service_1.default.refreshToken(connection);
                // console.log("Refershed connection: ", refreshedConnection);
                // console.log('New accessToken: ', decrypt(refreshedConnection.accessToken));
                // Update the connection with the refreshed token
                connection = refreshedConnection;
            }
            catch (err) {
                return {
                    success: false,
                    error: err.message || 'Token refresh failed. Please re-authenticate.',
                    platform,
                };
            }
        }
        // console.log('Access token after: ', decrypt(connection.accessToken));
        const poster = createPoster(platform, connection);
        return await poster.post(content);
    }
    catch (error) {
        console.log(`Error posting to ${platform}: ${error}`);
        // throw new Error(error.message);
        return {
            success: false,
            error: error.message,
            platform,
        };
    }
};
exports.post = post;
const postToMultiplePlatforms = async (orgId, platforms, content) => {
    const promises = platforms.map((platform) => (0, exports.post)(orgId, platform, content));
    return await Promise.all(promises);
};
exports.postToMultiplePlatforms = postToMultiplePlatforms;
const createPoster = (platform, connection) => {
    switch (platform) {
        case types_1.SocialPlatform.FACEBOOK:
            return new facebookPoster_1.FacebookPoster(connection);
        case types_1.SocialPlatform.INSTAGRAM:
            return new instaPoster_1.InstagramPoster(connection);
        case types_1.SocialPlatform.LINKEDIN:
            return new linkedInPoster_1.LinkedInPoster(connection);
        case types_1.SocialPlatform.PINTEREST:
            return new pinterestPoster_1.PinterestPoster(connection);
        case types_1.SocialPlatform.TIKTOK:
            return new tiktokPoster_1.TikTokPoster(connection);
        case types_1.SocialPlatform.TWITTER:
            return new twitterPoster_1.TwitterPoster(connection);
        case types_1.SocialPlatform.YOUTUBE:
            return new youtubePoster_1.YouTubePoster(connection);
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
};
