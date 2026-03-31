import { AuthClient, RestliClient } from "linkedin-api-client";
import {
  ComConInterface,
  ComOAuthConfig,
  ComPlatform,
} from "../../../Types/types";
import { COM_CONFIGS } from "./oauth-configs";
import { CommunityConnection } from "../../../Models/CommunityModels";
import { decrypt, encrypt } from "../../../Services/encryption";
import { extractErrorMessage } from "../../../helpers/axiosError";
import axios, { AxiosError } from "axios";
import crypto from "crypto";
import qs from "qs";

class ComOauth {
  // Store code_verifier for Twitter PKCE (OAuth 2.0)
  private codeVerifiers: Map<string, string> = new Map();

  /**
   * Sets up LinkedIn client for OAuth
   */
  setUpLinkedinClient(): {
    authClient: AuthClient;
    restliClient: RestliClient;
  } {
    let clientUrl = process.env.CLIENT_URL!;
    const platform = "linkedin";
    const config = COM_CONFIGS[platform];

    const authClient = new AuthClient({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUrl: `${clientUrl}/comm-auth/callback`,
    });
    const restliClient = new RestliClient();
    restliClient.setDebugParams({ enabled: true });

    return { authClient, restliClient };
  }

  /**
   * Generates OAuth authorization URL for the specified platform
   * @param platform The social platform (e.g., Twitter, LinkedIn)
   * @param orgId The user org ID
   * @returns Authorization URL and CSRF state
   */
  async generateAuthUrl(
    platform: ComPlatform,
    orgId: string,
  ): Promise<{ url: string; csrfState: Uint8Array }> {
    let params: URLSearchParams;
    let array = new Uint8Array(30);
    const csrfState = crypto.getRandomValues(array);
    const config = COM_CONFIGS[platform];
    const state = this.generateState(orgId, platform);

    if (platform === ComPlatform.LINKEDIN) {
      const { authClient } = this.setUpLinkedinClient();
      const url = authClient.generateMemberAuthorizationUrl(
        config.scopes,
        state,
      );
      return { url, csrfState };
    }

    if (platform === ComPlatform.TWITTER) {
      throw new Error("Twitter API currently unavailable");
    }

    // For Telegram, we need to handle bot token authorization differently
    if (platform === ComPlatform.TELEGRAM) {
      // Telegram uses bot tokens directly, not OAuth 2.0
      const botToken = config.clientId;
      const url = `https://oauth.telegram.org/auth?bot_id=${botToken}&origin=${encodeURIComponent(config.redirectUri)}&embed=0&request_access=write&state=${state}`;
      return { url, csrfState };
    }

    if (platform === ComPlatform.SLACK) {
      params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        user_scope: config.scopes.join(" "),
        response_type: "code",
        prompt: "consent",
        state: state,
      });
    } else {
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
  async handleCallback(code: string, state: string): Promise<ComConInterface> {
    const { orgId, platform } = this.parseState(state);
    const config = COM_CONFIGS[platform];

    try {
      let accessToken: string | undefined;
      let refreshToken: string | undefined;
      let expiresIn: number | undefined;
      let accountId: string | undefined;
      let accountName: string | undefined;
      let adAccounts: any[] = [];
      let metadata: any = {};

      // Handle OAuth 2.0 flow for all platforms including Twitter
      const tokenResponse = await this.exchangeCodeForToken(
        code,
        config,
        platform,
        state,
      );
      accessToken = tokenResponse.access_token || tokenResponse.authed_user?.access_token;
      refreshToken = tokenResponse.refresh_token;
      expiresIn = tokenResponse.expires_in;

      const userInfo = await this.getUserInfo(accessToken as string, platform);

      const refresh_expires_in =
        tokenResponse.refresh_token_expires_in ||
        tokenResponse.refresh_expires_in;

      // Extract platform-specific metadata
      if (platform === ComPlatform.FACEBOOK && userInfo.ad_accounts) {
        adAccounts = userInfo.ad_accounts;
        accountId = adAccounts[0]?.id || userInfo.id;
        accountName = adAccounts[0]?.name || userInfo.name;
      } else if (platform === ComPlatform.WHATSAPP) {
        // Get WhatsApp Business Account ID
        const wabaResponse = await this.getWhatsAppBusinessAccount(
          accessToken!,
        );
        accountId = wabaResponse.data[0]?.id;
        accountName = wabaResponse.data[0]?.name || "WhatsApp Business Account";

        // Get phone numbers
        const phoneNumbers = await this.getWhatsAppPhoneNumbers(
          accessToken!,
          accountId!,
        );
        metadata = {
          businessAccountId: accountId,
          wabaId: accountId,
          phoneNumbers: phoneNumbers.data,
          phoneNumberId: phoneNumbers.data[0]?.id,
        };
      } else if (platform === ComPlatform.TELEGRAM) {
        // For Telegram, the code is the bot token
        accessToken = code; // Bot token is the access token
        accountId = userInfo.result?.id?.toString();
        accountName = userInfo.result?.username || userInfo.result?.first_name;
        metadata = {
          botToken: accessToken,
        };
      } else {
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

      const connection = await CommunityConnection.findOneAndUpdate(
        { orgId, platform },
        {
          orgId,
          platform,
          accessToken: accessToken ? encrypt(accessToken) : undefined,
          refreshToken: refreshToken ? encrypt(refreshToken) : undefined,
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
        },
        { upsert: true, new: true },
      );

      if (!connection) throw new Error("Connection not saved");

      return connection;
    } catch (error: any) {
      console.error(`OAuth callback error for ${platform}:`, {
        error: error.response?.data || error.message,
        code,
        state,
      });
      if (error.message.includes("duplicate key error collection")) {
        throw new Error("Duplicate platforms not allowed!");
      }
      let errorMessage = extractErrorMessage(error as AxiosError);
      throw new Error(
        `OAuth callback failed for ${platform}: ${
          errorMessage || error.message
        }`,
      );
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
  private async exchangeCodeForToken(
    code: string,
    config: ComOAuthConfig,
    platform: ComPlatform,
    state?: string,
  ): Promise<any> {
    if (platform === ComPlatform.LINKEDIN) {
      const { authClient } = this.setUpLinkedinClient();
      const cred = await authClient.exchangeAuthCodeForAccessToken(code);
      console.log("LinkedIn Creds: ", cred);
      return cred;
    }

    // Handle Meta separately (Facebook & WhatsApp)
    if (
      platform === ComPlatform.FACEBOOK ||
      platform === ComPlatform.WHATSAPP
    ) {
      return this.handleMetaTokenExchange(code, config);
    }

    const params = new URLSearchParams({
      code,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    });

    let headers: { [key: string]: string } = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    if (platform === ComPlatform.TELEGRAM) {
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
      const response = await axios.post(config.tokenUrl, params, {
        headers,
      });
      console.log(`Token exchange response for ${platform}:`, response.data);
      return response.data;
    } catch (error: any) {
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
  private async getWhatsAppBusinessAccount(accessToken: string): Promise<any> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v23.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`,
      );

      // Filter for WhatsApp Business Accounts
      const wabaAccounts = response.data.data.filter((account: any) => {
        // You might want to check for specific criteria to identify WABA
        return true; // Adjust based on your needs
      });

      return { data: wabaAccounts };
    } catch (error: any) {
      console.error("Error fetching WhatsApp Business Account:", error);
      throw error;
    }
  }

  /**
   * Get WhatsApp phone numbers for a business account
   */
  private async getWhatsAppPhoneNumbers(
    accessToken: string,
    wabaId: string,
  ): Promise<any> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v23.0/${wabaId}/phone_numbers?access_token=${accessToken}`,
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching WhatsApp phone numbers:", error);
      throw error;
    }
  }

  private async handleMetaTokenExchange(
    code: string,
    config: ComOAuthConfig,
  ): Promise<any> {
    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
      grant_type: "authorization_code",
    });

    try {
      const response = await axios.get(
        `${config.tokenUrl}?${params.toString()}`,
      );
      return response.data;
    } catch (error: any) {
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
  private async getUserInfo(
    accessToken: string,
    platform: ComPlatform,
  ): Promise<any> {
    const endpoints = {
      [ComPlatform.FACEBOOK]:
        "https://graph.facebook.com/v23.0/me?fields=id,name",
      [ComPlatform.INSTAGRAM]: "https://www.googleapis.com/oauth2/v2/userinfo",
      [ComPlatform.LINKEDIN]: "https://api.linkedin.com/v2/userinfo",
      [ComPlatform.WHATSAPP]:
        "https://graph.facebook.com/v23.0/me?fields=id,name",
      [ComPlatform.DISCORD]: "https://discord.com/api/users/@me",
      [ComPlatform.SLACK]: "https://slack.com/api/users.profile.get",
      [ComPlatform.TELEGRAM]: `https://api.telegram.org/bot${accessToken}/getMe`,
      [ComPlatform.TWITTER]: `https://api.telegram.org/bot${accessToken}/getMe`,
    };

    try {
      if (platform === ComPlatform.LINKEDIN) {
        const { restliClient } = this.setUpLinkedinClient();
        const response = await restliClient.get({
          resourcePath: "/userinfo",
          accessToken,
        });
        return response.data;
      }

      if (platform === ComPlatform.FACEBOOK) {
        // For Meta, we need to get the ad accounts as well
        const userResponse = await axios.get(endpoints[platform], {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        // Get ad accounts for Meta
        const adAccountsResponse = await axios.get(
          `https://graph.facebook.com/v23.0/me/adaccounts?fields=id,name,account_status&access_token=${accessToken}`,
        );

        return {
          ...userResponse.data,
          ad_accounts: adAccountsResponse.data.data,
        };
      }

      if (platform === ComPlatform.TELEGRAM) {
        // Telegram uses bot API
        const response = await axios.get(endpoints[platform]);
        return response.data;
      }

      const response = await axios.get(endpoints[platform], {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log(`User info response for ${platform}:`, response.data);
      return response.data;
    } catch (error: any) {
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
  private generateState(orgId: string, platform: ComPlatform): string {
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
  parseState(state: string): {
    orgId: string;
    platform: ComPlatform;
  } {
    try {
      const data = JSON.parse(Buffer.from(state, "base64").toString());
      return {
        orgId: data.orgId,
        platform: data.platform,
      };
    } catch (error) {
      console.error("Error parsing state:", error);
      throw new Error("Invalid state parameter");
    }
  }

  /**
   * Refreshes an access token using a refresh token
   * @param connection Existing social connection
   * @returns Updated SocialConnection object
   */
  async refreshToken(connection: ComConInterface): Promise<ComConInterface> {
    if (!connection.refreshToken) {
      throw new Error("No refresh token available");
    }

    const config = COM_CONFIGS[connection.platform];
    const refreshToken = decrypt(connection.refreshToken);
    console.log("Refresh Token: ", refreshToken);

    let headers: { [key: string]: string } = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    try {
      const response = await axios.post(config.tokenUrl, params, {
        headers,
      });

      console.log("Refresh token response data: ", response.data);

      const updatedConnection = await CommunityConnection.findOneAndUpdate(
        { _id: connection._id },
        {
          accessToken: encrypt(response.data.access_token),
          refreshToken: response.data.refresh_token
            ? encrypt(response.data.refresh_token)
            : connection.refreshToken,
          expiresAt: response.data.expires_in
            ? new Date(Date.now() + response.data.expires_in * 1000)
            : undefined,
          updatedAt: new Date(),
        },
        { new: true },
      );

      if (!updatedConnection) {
        throw new Error("Connection details not updated");
      }

      return updatedConnection;
    } catch (error: any) {
      console.error(`Error refreshing token for ${connection.platform}:`, {
        error: error.response?.data || error.message,
      });
      throw new Error(
        `Token refresh failed for ${connection.platform}: ${error.message}`,
      );
    }
  }

  async revokeConnection(connection: ComConInterface) {
    await CommunityConnection.findByIdAndDelete(connection._id);
  }
}

export default new ComOauth();
