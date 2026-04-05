import axios, { AxiosError } from "axios";
import { extractErrorMessage } from "../../../helpers/axiosError";
import { decrypt, encrypt } from "../../../Services/encryption";
import { EmailCredential, IEmailCredential } from "../../../Models/Campaign";

export enum MailPlatform {
  GOOGLE = "google",
  MICROSOFT = "microsoft",
  ZOHO = "zoho",
}
let clientUrl = process.env.CLIENT_URL!;

interface MailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

export interface MailRes {
  provider: MailPlatform;
  accessToken: string;
  refreshToken?: string;
  email?: string;
  accountId: string;
  accountName?: string;
  orgId: string;
  expiresAt: number;
}

const MAIL_CONFIG: Record<MailPlatform, MailConfig> = {
  [MailPlatform.GOOGLE]: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: `${clientUrl}/mail-auth/callback`,
    scopes: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.send'],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
  },
  [MailPlatform.MICROSOFT]: {
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    redirectUri: `${clientUrl}/mail-auth/callback`,
    scopes: [
      'openid',
      'profile',
      'email',
      'offline_access',
      'User.Read',
      'https://graph.microsoft.com/Mail.Send',
    ],
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  },
  [MailPlatform.ZOHO]: {
    clientId: process.env.ZOHO_CLIENT_ID!,
    clientSecret: process.env.ZOHO_CLIENT_SECRET!,
    redirectUri: `${clientUrl}/mail-auth/callback`,
    scopes: [
      'ZohoMail.messages.ALL',
      'ZohoMail.accounts.READ',
      'ZohoMail.accounts.ALL',
      'aaaserver.profile.READ',
    ],
    authUrl: 'https://accounts.zoho.com/oauth/v2/auth',
    tokenUrl: 'https://accounts.zoho.com/oauth/v2/token',
  },
};

class MailOauthService {
  /**
   * Generates OAuth authorization URL for the specified platform
   * @param platform The social platform (e.g., Twitter, LinkedIn)
   * @param orgId The user ID
   * @returns Authorization URL and CSRF state
   */
  generateAuthUrl(
    platform: MailPlatform,
    orgId: string
  ): { url: string; csrfState: Uint8Array } {
    let array = new Uint8Array(30);
    const csrfState = crypto.getRandomValues(array);
    const config = MAIL_CONFIG[platform];
    const state = this.generateState(orgId, platform);

    // Default case for other platforms
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(","),
      response_type: "code",
      prompt: "consent",
      access_type: "offline",
      state: state,
    });

    // if (platform === MailPlatform.ZOHO) {
    //   params.append("access_type", "offline");
    // }

    return { url: `${config.authUrl}?${params.toString()}`, csrfState };
  }

  /**
   * Handles OAuth callback and exchanges code for tokens
   * @param code Authorization code from callback
   * @param state State parameter from callback
   * @returns MailRes object
   */
  async handleCallback(code: string, state: string): Promise<MailRes> {
    const { orgId, platform } = this.parseState(state);
    const config = MAIL_CONFIG[platform];

    try {
      const tokenResponse = await this.exchangeCodeForToken(
        code,
        config,
        platform,
        state
      );
      const userInfo = await this.getUserInfo(
        tokenResponse.access_token,
        platform
      );

      const refresh_expires_in =
        tokenResponse.refresh_token_expires_in ||
        tokenResponse.refresh_expires_in;

      const result: MailRes = {
        provider: platform,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || undefined,
        email: userInfo.email,
        accountId: userInfo.id || userInfo.sub,
        accountName: userInfo.name,
        orgId,
        expiresAt: tokenResponse.expires_in
      };

      return result;
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
        }`
      );
    }
  }

  /**
   * Refreshes an access token using a refresh token
   * @param connection Existing social connection
   * @returns Updated SocialConnection object
   */
  async refreshToken(connection: IEmailCredential): Promise<IEmailCredential> {
    if (!connection.refreshToken) {
      throw new Error("No refresh token available");
    }

    const config = MAIL_CONFIG[connection.provider];
    const refreshToken = decrypt(connection.refreshToken);
    console.log("Refersh Token: ", refreshToken);

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

      console.log("Res data: ", response.data);

      const updatedConnection = await EmailCredential.findOneAndUpdate(
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
        { new: true }
      );

      if (!updatedConnection) {
        throw new Error("Connection details not updated");
      }

      return updatedConnection;
    } catch (error: any) {
      console.error(`Error refreshing token for ${connection.provider}:`, {
        error: error.response?.data || error.message,
      });
      throw new Error(
        `Token refresh failed for ${connection.provider}: ${error.message}`
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
    config: MailConfig,
    platform: MailPlatform,
    state?: string
  ): Promise<any> {
    const params = new URLSearchParams({
      code,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    });

    let headers: { [key: string]: string } = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

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
   * Fetches user info using access token
   * @param accessToken Access token
   * @param platform Social platform
   * @returns User info
   */
  private async getUserInfo(
    accessToken: string,
    platform: MailPlatform
  ): Promise<any> {
    const endpoints = {
      [MailPlatform.GOOGLE]: "https://www.googleapis.com/oauth2/v2/userinfo",
      [MailPlatform.MICROSOFT]: "https://graph.microsoft.com//oidc/userinfo",
      [MailPlatform.ZOHO]: "https://api.pinterest.com/v5/user_account",
    };

    try {
      if (platform === MailPlatform.ZOHO) {
        console.log('Trying Zoho');
      } else {
        const response = await axios.get(endpoints[platform], {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        console.log(`User info response for ${platform}:`, response.data);
        return response.data;
      }
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
  private generateState(orgId: string, platform: MailPlatform): string {
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
    platform: MailPlatform;
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
}

export default new MailOauthService();
