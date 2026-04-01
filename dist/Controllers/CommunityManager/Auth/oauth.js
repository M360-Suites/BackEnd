"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const linkedin_api_client_1 = require("linkedin-api-client");
const types_1 = require("../../../Types/types");
const oauth_configs_1 = require("./oauth-configs");
const CommunityModels_1 = require("../../../Models/CommunityModels");
const encryption_1 = require("../../../Services/encryption");
const axiosError_1 = require("../../../helpers/axiosError");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
class ComOauth {
    constructor() {
        // Store code_verifier for Twitter PKCE (OAuth 2.0)
        this.codeVerifiers = new Map();
    }
    /**
     * Sets up LinkedIn client for OAuth
     */
    setUpLinkedinClient() {
        let clientUrl = process.env.CLIENT_URL;
        const platform = "linkedin";
        const config = oauth_configs_1.COM_CONFIGS[platform];
        const authClient = new linkedin_api_client_1.AuthClient({
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            redirectUrl: `${clientUrl}/comm-auth/callback`,
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
    async generateAuthUrl(platform, orgId) {
        let params;
        let array = new Uint8Array(30);
        const csrfState = crypto_1.default.getRandomValues(array);
        const config = oauth_configs_1.COM_CONFIGS[platform];
        const state = this.generateState(orgId, platform);
        if (platform === types_1.ComPlatform.LINKEDIN) {
            const { authClient } = this.setUpLinkedinClient();
            const url = authClient.generateMemberAuthorizationUrl(config.scopes, state);
            return { url, csrfState };
        }
        if (platform === types_1.ComPlatform.TWITTER) {
            throw new Error("Twitter API currently unavailable");
        }
        // For Telegram, we need to handle bot token authorization differently
        if (platform === types_1.ComPlatform.TELEGRAM) {
            // Telegram uses bot tokens directly, not OAuth 2.0
            const botToken = config.clientId;
            const url = `https://oauth.telegram.org/auth?bot_id=${botToken}&origin=${encodeURIComponent(config.redirectUri)}&embed=0&request_access=write&state=${state}`;
            return { url, csrfState };
        }
        if (platform === types_1.ComPlatform.SLACK) {
            params = new URLSearchParams({
                client_id: config.clientId,
                redirect_uri: config.redirectUri,
                user_scope: config.scopes.join(" "),
                response_type: "code",
                prompt: "consent",
                state: state,
            });
        }
        else {
            // Default case for other platforms (including WhatsApp)
            params = new URLSearchParams({
                client_id: config.clientId,
                redirect_uri: config.redirectUri,
                scope: config.scopes.join(" "),
                response_type: "code",
                prompt: "consent",
                state: state,
            });
        }
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
        const config = oauth_configs_1.COM_CONFIGS[platform];
        try {
            let accessToken;
            let refreshToken;
            let expiresIn;
            let accountId;
            let accountName;
            let adAccounts = [];
            let metadata = {};
            // Handle OAuth 2.0 flow for all platforms including Twitter
            const tokenResponse = await this.exchangeCodeForToken(code, config, platform, state);
            accessToken = tokenResponse.access_token || tokenResponse.authed_user?.access_token;
            refreshToken = tokenResponse.refresh_token;
            expiresIn = tokenResponse.expires_in;
            const userInfo = await this.getUserInfo(accessToken, platform);
            const refresh_expires_in = tokenResponse.refresh_token_expires_in ||
                tokenResponse.refresh_expires_in;
            // Extract platform-specific metadata
            if (platform === types_1.ComPlatform.FACEBOOK && userInfo.ad_accounts) {
                adAccounts = userInfo.ad_accounts;
                accountId = adAccounts[0]?.id || userInfo.id;
                accountName = adAccounts[0]?.name || userInfo.name;
            }
            else if (platform === types_1.ComPlatform.WHATSAPP) {
                // Get WhatsApp Business Account ID
                const wabaResponse = await this.getWhatsAppBusinessAccount(accessToken);
                accountId = wabaResponse.data[0]?.id;
                accountName = wabaResponse.data[0]?.name || "WhatsApp Business Account";
                // Get phone numbers
                const phoneNumbers = await this.getWhatsAppPhoneNumbers(accessToken, accountId);
                metadata = {
                    businessAccountId: accountId,
                    wabaId: accountId,
                    phoneNumbers: phoneNumbers.data,
                    phoneNumberId: phoneNumbers.data[0]?.id,
                };
            }
            else if (platform === types_1.ComPlatform.TELEGRAM) {
                // For Telegram, the code is the bot token
                accessToken = code; // Bot token is the access token
                accountId = userInfo.result?.id?.toString();
                accountName = userInfo.result?.username || userInfo.result?.first_name;
                metadata = {
                    botToken: accessToken,
                };
            }
            else {
                // For other platforms
                accountId =
                    userInfo.id ||
                        userInfo.sub ||
                        userInfo.data?.id ||
                        userInfo.data?.user?.open_id || tokenResponse.authed_user?.id;
                accountName =
                    userInfo.name ||
                        userInfo.data?.name ||
                        userInfo.data?.user?.display_name || userInfo.profile?.real_name;
            }
            const connection = await CommunityModels_1.CommunityConnection.findOneAndUpdate({ orgId, platform }, {
                orgId,
                platform,
                accessToken: accessToken ? (0, encryption_1.encrypt)(accessToken) : undefined,
                refreshToken: refreshToken ? (0, encryption_1.encrypt)(refreshToken) : undefined,
                expiresAt: expiresIn
                    ? new Date(Date.now() + expiresIn * 1000)
                    : undefined,
                refreshExpiresAt: refresh_expires_in
                    ? new Date(Date.now() + refresh_expires_in * 1000)
                    : undefined,
                accountId,
                accountName,
                adAccounts,
                scopes: config.scopes,
                metadata,
            }, { upsert: true, new: true });
            if (!connection)
                throw new Error("Connection not saved");
            return connection;
        }
        catch (error) {
            console.error(`OAuth callback error for ${platform}:`, {
                error: error.response?.data || error.message,
                code,
                state,
            });
            if (error.message.includes("duplicate key error collection")) {
                throw new Error("Duplicate platforms not allowed!");
            }
            let errorMessage = (0, axiosError_1.extractErrorMessage)(error);
            throw new Error(`OAuth callback failed for ${platform}: ${errorMessage || error.message}`);
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
        if (platform === types_1.ComPlatform.LINKEDIN) {
            const { authClient } = this.setUpLinkedinClient();
            const cred = await authClient.exchangeAuthCodeForAccessToken(code);
            console.log("LinkedIn Creds: ", cred);
            return cred;
        }
        // Handle Meta separately (Facebook & WhatsApp)
        if (platform === types_1.ComPlatform.FACEBOOK ||
            platform === types_1.ComPlatform.WHATSAPP) {
            return this.handleMetaTokenExchange(code, config);
        }
        const params = new URLSearchParams({
            code,
            redirect_uri: config.redirectUri,
            grant_type: "authorization_code",
        });
        let headers = {
            "Content-Type": "application/x-www-form-urlencoded",
        };
        if (platform === types_1.ComPlatform.TELEGRAM) {
            // Telegram doesn't use OAuth 2.0 token exchange
            // The bot token is provided during authorization
            return {
                access_token: code,
                token_type: "Bearer",
            };
        }
        // For non-Twitter platforms, include client_id and client_secret in body
        params.append("client_id", config.clientId);
        params.append("client_secret", config.clientSecret);
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
     * Get WhatsApp Business Account details
     */
    async getWhatsAppBusinessAccount(accessToken) {
        try {
            const response = await axios_1.default.get(`https://graph.facebook.com/v23.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`);
            // Filter for WhatsApp Business Accounts
            const wabaAccounts = response.data.data.filter((account) => {
                // You might want to check for specific criteria to identify WABA
                return true; // Adjust based on your needs
            });
            return { data: wabaAccounts };
        }
        catch (error) {
            console.error("Error fetching WhatsApp Business Account:", error);
            throw error;
        }
    }
    /**
     * Get WhatsApp phone numbers for a business account
     */
    async getWhatsAppPhoneNumbers(accessToken, wabaId) {
        try {
            const response = await axios_1.default.get(`https://graph.facebook.com/v23.0/${wabaId}/phone_numbers?access_token=${accessToken}`);
            return response.data;
        }
        catch (error) {
            console.error("Error fetching WhatsApp phone numbers:", error);
            throw error;
        }
    }
    async handleMetaTokenExchange(code, config) {
        const params = new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: config.redirectUri,
            code,
            grant_type: "authorization_code",
        });
        try {
            const response = await axios_1.default.get(`${config.tokenUrl}?${params.toString()}`);
            return response.data;
        }
        catch (error) {
            console.error("Meta token exchange error:", {
                error: error.response?.data || error.message,
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
            [types_1.ComPlatform.FACEBOOK]: "https://graph.facebook.com/v23.0/me?fields=id,name",
            [types_1.ComPlatform.INSTAGRAM]: "https://www.googleapis.com/oauth2/v2/userinfo",
            [types_1.ComPlatform.LINKEDIN]: "https://api.linkedin.com/v2/userinfo",
            [types_1.ComPlatform.WHATSAPP]: "https://graph.facebook.com/v23.0/me?fields=id,name",
            [types_1.ComPlatform.DISCORD]: "https://discord.com/api/users/@me",
            [types_1.ComPlatform.SLACK]: "https://slack.com/api/users.profile.get",
            [types_1.ComPlatform.TELEGRAM]: `https://api.telegram.org/bot${accessToken}/getMe`,
            [types_1.ComPlatform.TWITTER]: `https://api.telegram.org/bot${accessToken}/getMe`,
        };
        try {
            if (platform === types_1.ComPlatform.LINKEDIN) {
                const { restliClient } = this.setUpLinkedinClient();
                const response = await restliClient.get({
                    resourcePath: "/userinfo",
                    accessToken,
                });
                return response.data;
            }
            if (platform === types_1.ComPlatform.FACEBOOK) {
                // For Meta, we need to get the ad accounts as well
                const userResponse = await axios_1.default.get(endpoints[platform], {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                // Get ad accounts for Meta
                const adAccountsResponse = await axios_1.default.get(`https://graph.facebook.com/v23.0/me/adaccounts?fields=id,name,account_status&access_token=${accessToken}`);
                return {
                    ...userResponse.data,
                    ad_accounts: adAccountsResponse.data.data,
                };
            }
            if (platform === types_1.ComPlatform.TELEGRAM) {
                // Telegram uses bot API
                const response = await axios_1.default.get(endpoints[platform]);
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
        return Buffer.from(data).toString("base64");
    }
    /**
     * Parses state parameter
     * @param state Base64-encoded state
     * @returns Parsed orgId and platform
     */
    parseState(state) {
        try {
            const data = JSON.parse(Buffer.from(state, "base64").toString());
            return {
                orgId: data.orgId,
                platform: data.platform,
            };
        }
        catch (error) {
            console.error("Error parsing state:", error);
            throw new Error("Invalid state parameter");
        }
    }
    /**
     * Refreshes an access token using a refresh token
     * @param connection Existing social connection
     * @returns Updated SocialConnection object
     */
    async refreshToken(connection) {
        if (!connection.refreshToken) {
            throw new Error("No refresh token available");
        }
        const config = oauth_configs_1.COM_CONFIGS[connection.platform];
        const refreshToken = (0, encryption_1.decrypt)(connection.refreshToken);
        console.log("Refresh Token: ", refreshToken);
        let headers = {
            "Content-Type": "application/x-www-form-urlencoded",
        };
        const params = new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        });
        try {
            const response = await axios_1.default.post(config.tokenUrl, params, {
                headers,
            });
            console.log("Refresh token response data: ", response.data);
            const updatedConnection = await CommunityModels_1.CommunityConnection.findOneAndUpdate({ _id: connection._id }, {
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
                throw new Error("Connection details not updated");
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
    async revokeConnection(connection) {
        await CommunityModels_1.CommunityConnection.findByIdAndDelete(connection._id);
    }
}
exports.default = new ComOauth();
