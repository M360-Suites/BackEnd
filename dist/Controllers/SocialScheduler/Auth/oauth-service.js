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
const axios_1 = __importDefault(require("axios"));
const url_1 = require("url");
const types_1 = require("../../../Types/types");
const oauth_configs_1 = require("./oauth-configs");
const encryption_1 = require("../../../Services/encryption");
const SocialModels_1 = require("../../../Models/SocialModels");
const crypto = __importStar(require("crypto"));
const linkedin_api_client_1 = require("linkedin-api-client");
const dotenv_1 = __importDefault(require("dotenv"));
const axiosError_1 = require("../../../helpers/axiosError");
dotenv_1.default.config();
class OAuthService {
    constructor() {
        // Store code_verifier for Twitter PKCE
        this.codeVerifiers = new Map(); // Map state to code_verifier
    }
    /**
     * Sets up LinkedIn client for OAuth
     */
    setUpLinkedinClient() {
        let server = process.env.NODE_ENV === 'development'
            ? 'http://localhost:5001/api'
            : 'https://m360-wn9s.onrender.com/api';
        const platform = 'linkedin';
        const config = oauth_configs_1.OAUTH_CONFIGS[platform];
        const clientUrl = process.env.CLIENT_URL;
        const authClient = new linkedin_api_client_1.AuthClient({
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            redirectUrl: `${clientUrl}/auth/callback`,
        });
        const restliClient = new linkedin_api_client_1.RestliClient();
        restliClient.setDebugParams({ enabled: true });
        return { authClient, restliClient };
    }
    /**
     * Generates OAuth authorization URL for the specified platform
     * @param platform The social platform (e.g., Twitter, LinkedIn)
     * @param orgId The user org ID
     * @returns Authorization URL and CSRF state
     */
    generateAuthUrl(platform, orgId) {
        let array = new Uint8Array(30);
        const csrfState = crypto.getRandomValues(array);
        const config = oauth_configs_1.OAUTH_CONFIGS[platform];
        const state = this.generateState(orgId, platform);
        if (platform === types_1.SocialPlatform.TIKTOK) {
            let url = new url_1.URL('https://www.tiktok.com/v2/auth/authorize');
            let codeVerifier = this.generateCodeVerifier();
            let codeChallenge = this.generateCodeChallenge(codeVerifier);
            url.searchParams.append('client_key', config.clientId);
            url.searchParams.append('scope', 'user.info.basic,video.upload,video.publish,user.info.profile');
            url.searchParams.append('response_type', 'code');
            url.searchParams.append('redirect_uri', 'https://m360-wn9s.onrender.com/api/oauth/callback'); //localhost not allowed
            url.searchParams.append('state', state);
            url.searchParams.append('disable_auto_auth', '1');
            url.searchParams.append('code_challenge', codeChallenge);
            url.searchParams.append('code_challenge_method', 'S256');
            return { url: url.toString(), csrfState };
        }
        else if (platform === types_1.SocialPlatform.LINKEDIN) {
            const { authClient } = this.setUpLinkedinClient();
            const url = authClient.generateMemberAuthorizationUrl(config.scopes, state);
            return { url, csrfState };
        }
        else if (platform === types_1.SocialPlatform.TWITTER) {
            const clientId = config.clientId;
            const redirectUri = config.redirectUri;
            const scopes = 'tweet.write tweet.read users.read offline.access media.write';
            // Generate PKCE code_verifier and code_challenge
            const codeVerifier = this.generateCodeVerifier();
            const codeChallenge = this.generateCodeChallenge(codeVerifier);
            // Store codeVerifier for use in token exchange
            this.codeVerifiers.set(state, codeVerifier);
            console.log(`Twitter: Stored code_verifier for state ${state}:`, codeVerifier);
            // Construct the authorization URL
            const authUrl = new url_1.URL('https://twitter.com/i/oauth2/authorize');
            authUrl.searchParams.append('client_id', clientId);
            authUrl.searchParams.append('redirect_uri', redirectUri);
            authUrl.searchParams.append('scope', scopes);
            authUrl.searchParams.append('response_type', 'code');
            authUrl.searchParams.append('prompt', 'consent');
            authUrl.searchParams.append('state', state);
            authUrl.searchParams.append('code_challenge', codeChallenge);
            authUrl.searchParams.append('code_challenge_method', 'S256');
            // console.log(`Twitter: Generated auth URL: ${authUrl.toString()}`);
            return { url: authUrl.toString(), csrfState };
        }
        // Default case for other platforms
        const params = new url_1.URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            scope: config.scopes.join(' '),
            response_type: 'code',
            prompt: 'consent',
            state: state,
            access_type: 'offline',
        });
        return { url: `${config.authUrl}?${params.toString()}`, csrfState };
    }
    /**
     * Handles OAuth callback and exchanges code for tokens
     * @param code Authorization code from callback
     * @param state State parameter from callback
     * @returns SocialConnection object
     */
    async handleCallback(code, state) {
        const { orgId, platform } = this.parseState(state);
        const config = oauth_configs_1.OAUTH_CONFIGS[platform];
        try {
            const tokenResponse = await this.exchangeCodeForToken(code, config, platform, state);
            const userInfo = await this.getUserInfo(tokenResponse.access_token, platform);
            const refresh_expires_in = tokenResponse.refresh_token_expires_in || tokenResponse.refresh_expires_in;
            const connection = await SocialModels_1.SocialConnectionModel.findOneAndUpdate({ orgId, platform }, {
                orgId,
                platform,
                accessToken: (0, encryption_1.encrypt)(tokenResponse.access_token),
                refreshToken: tokenResponse.refresh_token
                    ? (0, encryption_1.encrypt)(tokenResponse.refresh_token)
                    : undefined,
                expiresAt: tokenResponse.expires_in
                    ? new Date(Date.now() + tokenResponse.expires_in * 1000)
                    : undefined,
                refreshExpiresAt: refresh_expires_in
                    ? new Date(Date.now() + refresh_expires_in * 1000)
                    : undefined,
                accountId: userInfo.id || userInfo.sub || userInfo.data?.id || userInfo.data?.user?.open_id,
                accountName: userInfo.name || userInfo.data?.name || userInfo.data?.user?.display_name,
                scopes: config.scopes,
            }, { upsert: true, new: true });
            if (!connection)
                throw new Error('Connection not saved');
            // Clean up code_verifier for Twitter
            if (platform === types_1.SocialPlatform.TWITTER || platform === types_1.SocialPlatform.TIKTOK) {
                this.codeVerifiers.delete(state);
                console.log(`Twitter: Cleaned up code_verifier for state ${state}`);
            }
            return connection;
        }
        catch (error) {
            console.error(`OAuth callback error for ${platform}:`, {
                error: error.response?.data || error.message,
                code,
                state,
            });
            if (error.message.includes('duplicate key error collection')) {
                throw new Error('Duplicate platforms not allowed!');
            }
            let errorMessage = (0, axiosError_1.extractErrorMessage)(error);
            throw new Error(`OAuth callback failed for ${platform}: ${errorMessage || error.message}`);
        }
    }
    /**
     * Refreshes an access token using a refresh token
     * @param connection Existing social connection
     * @returns Updated SocialConnection object
     */
    async refreshToken(connection) {
        if (!connection.refreshToken) {
            throw new Error('No refresh token available');
        }
        const config = oauth_configs_1.OAUTH_CONFIGS[connection.platform];
        const refreshToken = (0, encryption_1.decrypt)(connection.refreshToken);
        console.log('Refersh Token: ', refreshToken);
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        const params = new url_1.URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        });
        if (connection.platform === types_1.SocialPlatform.TWITTER) {
            // Add Basic Auth header for confidential client
            const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
            headers['Authorization'] = `Basic ${authHeader}`;
        }
        try {
            const response = await axios_1.default.post(config.tokenUrl, params, {
                headers,
            });
            console.log('Res data: ', response.data);
            const updatedConnection = await SocialModels_1.SocialConnectionModel.findOneAndUpdate({ _id: connection._id }, {
                accessToken: (0, encryption_1.encrypt)(response.data.access_token),
                refreshToken: response.data.refresh_token
                    ? (0, encryption_1.encrypt)(response.data.refresh_token)
                    : connection.refreshToken,
                expiresAt: response.data.expires_in
                    ? new Date(Date.now() + response.data.expires_in * 1000)
                    : undefined,
                updatedAt: new Date(),
            }, { new: true });
            if (!updatedConnection) {
                throw new Error('Connection details not updated');
            }
            return updatedConnection;
        }
        catch (error) {
            console.error(`Error refreshing token for ${connection.platform}:`, {
                error: error.response?.data || error.message,
            });
            throw new Error(`Token refresh failed for ${connection.platform}: ${error.message}`);
        }
    }
    /**
     * Exchanges authorization code for access token
     * @param code Authorization code
     * @param config OAuth configuration
     * @param platform Social platform
     * @param state State parameter for Twitter PKCE
     * @returns Token response
     */
    async exchangeCodeForToken(code, config, platform, state) {
        if (platform === types_1.SocialPlatform.LINKEDIN) {
            const { authClient } = this.setUpLinkedinClient();
            return authClient.exchangeAuthCodeForAccessToken(code);
        }
        const params = new url_1.URLSearchParams({
            code,
            redirect_uri: config.redirectUri,
            grant_type: 'authorization_code',
        });
        // Add code_verifier for Twitter PKCE
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        if (platform === types_1.SocialPlatform.TWITTER) {
            if (state) {
                const codeVerifier = this.codeVerifiers.get(state);
                if (!codeVerifier) {
                    throw new Error(`Code verifier not found for state ${state}`);
                }
                params.append('code_verifier', codeVerifier);
                // console.log(
                //   `Twitter: Using code_verifier for token exchange: ${codeVerifier}`
                // );
            }
            // Add Basic Auth header for confidential client
            const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
            headers['Authorization'] = `Basic ${authHeader}`;
        }
        else if (platform === types_1.SocialPlatform.TIKTOK) {
            if (state) {
                const codeVerifier = this.codeVerifiers.get(state);
                // if (!codeVerifier) {
                //   throw new Error(`Code verifier not found for state ${state}`);
                // }
                params.append('client_key', config.clientId);
                params.append('client_secret', config.clientSecret);
                // params.append("code_verifier", codeVerifier);
                headers['Cache-Control'] = 'no-cache';
            }
        }
        else {
            // For non-Twitter platforms, include client_id and client_secret in body
            params.append('client_id', config.clientId);
            params.append('client_secret', config.clientSecret);
        }
        try {
            const response = await axios_1.default.post(config.tokenUrl, params, {
                headers,
            });
            console.log(`Token exchange response for ${platform}:`, response.data);
            return response.data;
        }
        catch (error) {
            console.error(`Token exchange error for ${platform}:`, {
                error: error.response?.data || error.message,
                params: params.toString(),
                headers,
            });
            throw error;
        }
    }
    /**
     * Fetches user info using access token
     * @param accessToken Access token
     * @param platform Social platform
     * @returns User info
     */
    async getUserInfo(accessToken, platform) {
        const endpoints = {
            [types_1.SocialPlatform.FACEBOOK]: 'https://graph.facebook.com/me?fields=id,name',
            [types_1.SocialPlatform.INSTAGRAM]: 'https://graph.facebook.com/me?fields=id,name',
            [types_1.SocialPlatform.TWITTER]: 'https://api.twitter.com/2/users/me',
            [types_1.SocialPlatform.YOUTUBE]: 'https://www.googleapis.com/oauth2/v2/userinfo',
            [types_1.SocialPlatform.LINKEDIN]: 'https://api.linkedin.com/v2/userinfo',
            [types_1.SocialPlatform.TIKTOK]: 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name',
            [types_1.SocialPlatform.PINTEREST]: 'https://api.pinterest.com/v5/user_account',
        };
        try {
            if (platform === types_1.SocialPlatform.LINKEDIN) {
                const { restliClient } = this.setUpLinkedinClient();
                const response = await restliClient.get({
                    resourcePath: '/userinfo',
                    accessToken,
                });
                return response.data;
            }
            const response = await axios_1.default.get(endpoints[platform], {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            console.log(`User info response for ${platform}:`, response.data);
            return response.data;
        }
        catch (error) {
            console.error(`User info fetch error for ${platform}:`, {
                error: error.response?.data || error.message,
            });
            throw error;
        }
    }
    /**
     * Generates state parameter for OAuth
     * @param orgId User ID
     * @param platform Social platform
     * @returns Base64-encoded state
     */
    generateState(orgId, platform) {
        const data = JSON.stringify({
            orgId,
            platform,
            timestamp: Date.now(),
        });
        return Buffer.from(data).toString('base64');
    }
    /**
     * Parses state parameter
     * @param state Base64-encoded state
     * @returns Parsed orgId and platform
     */
    parseState(state) {
        try {
            const data = JSON.parse(Buffer.from(state, 'base64').toString());
            return {
                orgId: data.orgId,
                platform: data.platform,
            };
        }
        catch (error) {
            console.error('Error parsing state:', error);
            throw new Error('Invalid state parameter');
        }
    }
    /**
     * Generates PKCE code verifier
     * @returns Code verifier
     */
    generateCodeVerifier() {
        return crypto.randomBytes(64).toString('base64url');
    }
    /**
     * Generates PKCE code challenge from verifier
     * @param verifier Code verifier
     * @returns Code challenge
     */
    generateCodeChallenge(verifier) {
        const hash = crypto.createHash('sha256');
        hash.update(verifier);
        return hash.digest().toString('base64url').replace(/=/g, '');
    }
    async revokeConnection(connection) {
        await SocialModels_1.SocialConnectionModel.findByIdAndDelete(connection._id);
    }
}
exports.default = new OAuthService();
