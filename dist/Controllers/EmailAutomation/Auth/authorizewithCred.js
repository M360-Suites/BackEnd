"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authWithProvider = exports.zohoConsent = exports.handleCallback = exports.getAuthUrl = exports.detectProvider = void 0;
const responseService_1 = require("../../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
const promises_1 = __importDefault(require("dns/promises"));
const Campaign_1 = require("../../../Models/Campaign");
const encryption_1 = require("../../../Services/encryption");
const axios_1 = __importDefault(require("axios"));
const MailOauth_1 = __importStar(require("./MailOauth"));
const MailOauth_2 = __importDefault(require("./MailOauth"));
const MailOauth_3 = __importDefault(require("./MailOauth"));
const axiosError_1 = require("../../../helpers/axiosError");
const utils_1 = require("../../../helpers/utils");
exports.detectProvider = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { email } = req.body;
        const { error } = joi_1.default.object({
            email: validationSchema_1.default.email,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        let domain = email.split('@')[1];
        let provider = 'custom';
        const mxRecords = (await promises_1.default.resolveMx(domain)).sort((a, b) => a.priority - b.priority);
        const exchanges = mxRecords.map((r) => r.exchange.toLowerCase());
        // console.log("MxRecords: ", mxRecords);
        // console.log("Exchanges: ", exchanges);
        if (exchanges.some((mx) => mx.includes('google')))
            provider = 'google';
        if (exchanges.some((mx) => mx.includes('outlook') || mx.includes('microsoft')))
            provider = 'microsoft';
        if (exchanges.some((mx) => mx.includes('zoho')))
            provider = 'zoho';
        return (0, responseService_1.resSender)(res, 200, 'success', 'Provider detected successfully!', provider);
    }
    catch (error) {
        console.error('Could not resolve email domain: ', error);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Could not resolve email domain');
    }
});
exports.getAuthUrl = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        console.log('Got auth url req');
        const { error } = joi_1.default.object({
            platform: joi_1.default.string().required().valid('google', 'microsoft', 'zoho'),
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const { platform } = req.params;
        const orgId = req.organizationId?._id;
        console.log('Got: ', { orgId, platform });
        if (!Object.values(MailOauth_1.MailPlatform).includes(platform)) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Invalid platform');
        }
        const { url: authUrl, csrfState } = MailOauth_2.default.generateAuthUrl(platform, orgId);
        console.log('AUth Url: ', authUrl);
        // res.json({ authUrl });
        res.cookie('csrfState', csrfState, { maxAge: 60000 });
        // return res.redirect(authUrl);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Connect successful!', null, authUrl);
    }
    catch (error) {
        console.error('Error getting Oauth2 url: ', error);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Error getting Oauth2 url');
    }
});
exports.handleCallback = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        console.log('Callback received');
        const { code, state, location } = req.query;
        if (!code || !state)
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Missing code or state parameter');
        const { platform, orgId } = MailOauth_3.default.parseState(state);
        console.log('Queries are: ', { code, state, location });
        let result;
        if (platform === MailOauth_1.MailPlatform.ZOHO) {
            result = await (0, exports.zohoConsent)(code, orgId, location);
        }
        else {
            result = await MailOauth_1.default.handleCallback(code, state);
        }
        console.log('Res: ', result);
        let con = await Campaign_1.EmailCredential.findOneAndUpdate({ orgId: result.orgId, provider: result.provider }, {
            orgId: result.orgId,
            provider: result.provider,
            email: result.email,
            accessToken: (0, encryption_1.encrypt)(result.accessToken),
            refreshToken: result.refreshToken ? (0, encryption_1.encrypt)(result.refreshToken) : undefined,
            providerId: result.accountId,
            accountName: result.accountName,
        }, { upsert: true });
        return (0, responseService_1.resSender)(res, 200, 'success', 'Connect successful!');
    }
    catch (error) {
        console.log('Error in auth: ', error);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Error occured while connecting to platform.');
    }
});
/**
 * Handles OAuth callback and exchanges code for tokens
 * @param code Authorization code from callback
 * @param orgId req user's organization id parsed from state parameter
 * @param location location parameter from callback
 * @returns MailRes object
 */
const zohoConsent = async (code, orgId, location) => {
    let serverUrl = process.env.NODE_ENV === 'development' ? process.env.SERVER_URL : process.env.PROD_URL;
    let clientUrl = process.env.CLIENT_URL;
    try {
        // console.log("Query Data: ", { code, location });
        // Determine the correct token endpoint based on location
        const tokenEndpoint = location === 'eu'
            ? 'https://accounts.zoho.eu/oauth/v2/token'
            : location === 'in'
                ? 'https://accounts.zoho.in/oauth/v2/token'
                : 'https://accounts.zoho.com/oauth/v2/token';
        const { data } = await axios_1.default.post(tokenEndpoint, null, {
            params: {
                code,
                client_id: process.env.ZOHO_CLIENT_ID,
                client_secret: process.env.ZOHO_CLIENT_SECRET,
                redirect_uri: `${clientUrl}/mail-auth/callback`,
                grant_type: 'authorization_code',
                scope: 'ZohoMail.messages.CREATE,ZohoMail.accounts.READ',
            },
        });
        console.log('Data Res: ', data);
        const accessToken = data.access_token;
        const refreshToken = data.refresh_token ? data.refresh_token : null;
        if (!refreshToken) {
            throw new Error('No refresh token received from Zoho');
        }
        // Get user info
        const userInfo = await axios_1.default.get('https://accounts.zoho.com/oauth/user/info', {
            headers: { Authorization: `Bearer ${data.access_token}` },
        });
        console.log('User info: ', userInfo.data);
        const userEmail = userInfo.data.Email;
        if (!userEmail)
            throw new Error('No email found in Zoho response');
        // Get mail accounts - use the correct regional endpoint
        const mailEndpoint = location === 'eu'
            ? 'https://mail.zoho.eu/api/accounts'
            : location === 'in'
                ? 'https://mail.zoho.in/api/accounts'
                : 'https://mail.zoho.com/api/accounts';
        const accountsResponse = await axios_1.default.get(mailEndpoint, {
            headers: { Authorization: `Bearer ${data.access_token}` },
        });
        if (!accountsResponse.data.data || accountsResponse.data.data.length === 0) {
            throw new Error('No Zoho Mail accounts found. Please set up a Zoho Mail account first.');
        }
        // Use the first account ID (most users will only have one)
        const accountId = accountsResponse.data.data[0].accountId;
        let result = {
            accessToken,
            refreshToken,
            accountId,
            email: userEmail,
            provider: 'zoho',
            orgId,
        };
        return result;
    }
    catch (error) {
        console.error('Zoho consent error:', error.response?.data?.data?.moreInfo || error.message);
        let errorMessage = error.response?.data?.data?.moreInfo ||
            error.message ||
            (0, axiosError_1.extractErrorMessage)(error);
        throw new Error(`OAuth callback failed for zoho: ${errorMessage || error.message}`);
    }
};
exports.zohoConsent = zohoConsent;
// export const googleConsent = asyncHandler(async (req: any, res: Response) => {
//   try {
//     const user = req.user as any;
//     // console.log('Google Request: ',  req);
//     console.log('Google');
//     console.log("user: ", user);
//     let orgId = await User.findOne({ email: user.email });
//     if (!orgId)
//       return resSender(
//         res,
//         404,
//         "fail",
//         "User not found! Please register first"
//       );
//     if (!orgId.googleId) orgId.googleId = user.profile.id;
//     await orgId.save();
//     await EmailCredential.findOneAndUpdate(
//       { orgId: orgId._id, provider: "google" },
//       {
//         orgId: orgId._id,
//         provider: "google",
//         email: user.email,
//         accessToken: encrypt(user.accessToken),
//         refreshToken: encrypt(user.refreshToken),
//         providerId: user.profile.id,
//       },
//       { upsert: true }
//     );
//     return resSender(res, 200, "success", "Google consent successful!");
//   } catch (error: any) {
//     console.log("Error connecting to provider: ", error);
//     return resSender(
//       res,
//       500,
//       "error",
//       error.message || "Error connecting to provider"
//     );
//   }
// });
// export const microsoftConsent = asyncHandler(
//   async (req: any, res: Response) => {
//     try {
//       const user = req.user as any;
//       // console.log("Microsoft User: ", user);
//       if (!user?.email) {
//         throw new Error("Microsoft OAuth failed: No email found");
//       }
//       const appUser = await User.findOne({ email: user?.email });
//       if (!appUser)
//         return resSender(
//           res,
//           403,
//           "fail",
//           "User not found! Please register first"
//         );
//       await EmailCredential.findOneAndUpdate(
//         { orgId: appUser._id, provider: "microsoft" },
//         {
//           orgId: appUser._id,
//           provider: "microsoft",
//           email: user.email,
//           providerId: user.id,
//           accessToken: encrypt(user.accessToken),
//           refreshToken: encrypt(user.refreshToken),
//         },
//         { upsert: true }
//       );
//       return resSender(res, 200, "success", "Microsoft consent successful!");
//     } catch (error: any) {
//       console.error("Error connecting to provider: ", error);
//       return resSender(
//         res,
//         500,
//         "error",
//         error.message || "Error connecting to provider"
//       );
//     }
//   }
// );
exports.authWithProvider = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { error } = joi_1.default.object({
            provider: joi_1.default.string().valid('custom').required(),
            email: validationSchema_1.default.email,
            smtpHost: joi_1.default.string().required(),
            smtpPort: joi_1.default.number().required(),
            smtpSecure: joi_1.default.boolean().required(),
            smtpPassword: joi_1.default.string().required(),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const { provider, email, smtpHost, smtpPort, smtpSecure, smtpPassword } = req.body;
        const newCred = new Campaign_1.EmailCredential({
            orgId: req.organizationId?._id,
            provider,
            email,
            smtpHost,
            smtpPort,
            smtpSecure,
            smtpPassword: (0, encryption_1.encrypt)(smtpPassword),
        });
        await newCred.save();
        return (0, responseService_1.resSender)(res, 200, 'success', 'Operation successful!');
    }
    catch (error) {
        console.error('Error connecting to provider: ', error);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Error connecting to provider');
    }
});
