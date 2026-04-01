"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAdsCallback = exports.initAdsAuth = void 0;
const responseService_1 = require("../../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const ads_1 = require("../../../Types/ads");
const ads_oauth_1 = __importDefault(require("./ads-oauth"));
const utils_1 = require("../../../helpers/utils");
exports.initAdsAuth = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { error } = joi_1.default.object({
            platform: joi_1.default.string().required().valid("meta", "google", "twitter", "snapchat", "linkedin", "tiktok"),
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        const { platform } = req.params;
        const orgId = req.organizationId?._id;
        req.headers["x-org-id"] || req.query.orgId;
        console.log("Got platform: ", platform);
        if (!Object.values(ads_1.AdsPlatform).includes(platform)) {
            return (0, responseService_1.resSender)(res, 400, "fail", "Invalid platform");
        }
        const { url: authUrl, csrfState } = await ads_oauth_1.default.generateAuthUrl(platform, orgId);
        console.log("Ads AUth Url: ", authUrl);
        // res.json({ authUrl });
        res.cookie("csrfState", csrfState, { maxAge: 60000 });
        // return res.redirect(authUrl);
        return (0, responseService_1.resSender)(res, 200, "success", "Connect successful!", null, authUrl);
    }
    catch (error) {
        console.log("Error in Ads auth: ", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occured while connecting to platform.");
    }
});
// export const handleAdsCallback = asyncHandler(async (req: CustomRequest, res: Response) => {
//   try {
//     console.log("Ads Callback received");
//     const { code, state } = req.query;
//     if (!code || !state)
//       return resSender(res, 400, "fail", "Missing code or state parameter");
//     console.log("Ads Code is: ", code);
//     const con = await adsOauth.handleCallback(code as string, state as string);
//     console.log('COn got: ', con);
//     return resSender(res, 200, 'success', 'Connect Successful');
//   } catch (error: any) {
//     console.log("Error in Ads auth: ", error);
//     return resSender(
//       res,
//       500,
//       "error",
//       error.message || "Error occured while connecting to platform."
//     );
//   }
// })
exports.handleAdsCallback = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        console.log("Ads Callback received");
        const { oauth_verifier, oauth_token, code, state } = req.query;
        let connection;
        let platform;
        // Determine the flow based on query parameters
        const isTwitterFlow = oauth_verifier &&
            oauth_verifier !== "null" &&
            oauth_token &&
            oauth_token !== "null";
        console.log("Twitter flow detected?: ", isTwitterFlow);
        if (isTwitterFlow) {
            // Twitter OAuth 1.0a flow
            const retrievedState = ads_oauth_1.default.getStateFromToken(oauth_token);
            if (!retrievedState) {
                return (0, responseService_1.resSender)(res, 400, "fail", "Missing state", "Invalid or missing state for oauth_token");
            }
            platform = ads_oauth_1.default.parseState(retrievedState).platform;
            console.log("Handling Twitter OAuth 1.0a with oauth_verifier:", oauth_verifier);
            connection = await ads_oauth_1.default.handleCallback(oauth_verifier, retrievedState, oauth_token, oauth_verifier);
        }
        else if (code && state) {
            // OAuth 2.0 flow for other platforms
            platform = ads_oauth_1.default.parseState(state).platform;
            console.log("Handling OAuth 2.0 with code:", code);
            connection = await ads_oauth_1.default.handleCallback(code, state);
        }
        else {
            return (0, responseService_1.resSender)(res, 400, "fail", "Parameters missing", "Missing required parameters (oauth_verifier/oauth_token or code/state)");
        }
        return (0, responseService_1.resSender)(res, 200, "success", "Connect Successful", null, connection);
    }
    catch (error) {
        console.log("Error in Ads auth:", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occurred while connecting to platform.");
    }
});
