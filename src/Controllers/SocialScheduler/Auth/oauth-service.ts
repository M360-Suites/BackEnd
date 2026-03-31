import axios, { AxiosError } from 'axios';
import { URL, URLSearchParams } from 'url';
import { SocialPlatform, OAuthConfig, SocialConnection } from '../../../Types/types';
import { OAUTH_CONFIGS } from './oauth-configs';
import { decrypt, encrypt } from '../../../Services/encryption';
import { Types } from 'mongoose';
import { SocialConnectionModel } from '../../../Models/SocialModels';
import * as crypto from 'crypto';
import { AuthClient, RestliClient } from 'linkedin-api-client';
import dotenv from 'dotenv';
import { extractErrorMessage } from '../../../helpers/axiosError';
import qs from 'qs';

dotenv.config();

class OAuthService {
  // Store code_verifier for Twitter PKCE
  private codeVerifiers: Map<string, string> = new Map(); // Map state to code_verifier

  /**
   * Sets up LinkedIn client for OAuth
   */
  setUpLinkedinClient(): {
    authClient: AuthClient;
    restliClient: RestliClient;
  } {
    let server =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:5001/api'
        : 'https://m360-wn9s.onrender.com/api';
    const platform = 'linkedin';
    const config = OAUTH_CONFIGS[platform];
    const clientUrl = process.env.CLIENT_URL;

    const authClient = new AuthClient({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUrl: `${clientUrl}/auth/callback`,
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
  generateAuthUrl(platform: SocialPlatform, orgId: string): { url: string; csrfState: Uint8Array } {
    let array = new Uint8Array(30);
    const csrfState = crypto.getRandomValues(array);
    const config = OAUTH_CONFIGS[platform];
    const state = this.generateState(orgId, platform);

    if (platform === SocialPlatform.TIKTOK) {
      let url = new URL('https://www.tiktok.com/v2/auth/authorize');
      let codeVerifier = this.generateCodeVerifier();
      let codeChallenge = this.generateCodeChallenge(codeVerifier);

      url.searchParams.append('client_key', config.clientId);
      url.searchParams.append(
        'scope',
        'user.info.basic,video.upload,video.publish,user.info.profile',
      );
      url.searchParams.append('response_type', 'code');
      url.searchParams.append('redirect_uri', 'https://m360-wn9s.onrender.com/api/oauth/callback'); //localhost not allowed
      url.searchParams.append('state', state);
      url.searchParams.append('disable_auto_auth', '1');
      url.searchParams.append('code_challenge', codeChallenge);
      url.searchParams.append('code_challenge_method', 'S256');

      return { url: url.toString(), csrfState };
    } else if (platform === SocialPlatform.LINKEDIN) {
      const { authClient } = this.setUpLinkedinClient();
      const url = authClient.generateMemberAuthorizationUrl(config.scopes, state);
      return { url, csrfState };
    } else if (platform === SocialPlatform.TWITTER) {
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
      const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
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
    const params = new URLSearchParams({
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
  async handleCallback(code: string, state: string): Promise<SocialConnection> {
    const { orgId, platform } = this.parseState(state);
    const config = OAUTH_CONFIGS[platform];

    try {
      const tokenResponse = await this.exchangeCodeForToken(code, config, platform, state);
      const userInfo = await this.getUserInfo(tokenResponse.access_token, platform);

      const refresh_expires_in =
        tokenResponse.refresh_token_expires_in || tokenResponse.refresh_expires_in;

      const connection = await SocialConnectionModel.findOneAndUpdate(
        { orgId, platform },
        {
          orgId,
          platform,
          accessToken: encrypt(tokenResponse.access_token),
          refreshToken: tokenResponse.refresh_token
            ? encrypt(tokenResponse.refresh_token)
            : undefined,
          expiresAt: tokenResponse.expires_in
            ? new Date(Date.now() + tokenResponse.expires_in * 1000)
            : undefined,
          refreshExpiresAt: refresh_expires_in
            ? new Date(Date.now() + refresh_expires_in * 1000)
            : undefined,
          accountId:
            userInfo.id || userInfo.sub || userInfo.data?.id || userInfo.data?.user?.open_id,
          accountName: userInfo.name || userInfo.data?.name || userInfo.data?.user?.display_name,
          scopes: config.scopes,
        },
        { upsert: true, new: true },
      );

      if (!connection) throw new Error('Connection not saved');

      // Clean up code_verifier for Twitter
      if (platform === SocialPlatform.TWITTER || platform === SocialPlatform.TIKTOK) {
        this.codeVerifiers.delete(state);
        console.log(`Twitter: Cleaned up code_verifier for state ${state}`);
      }

      return connection;
    } catch (error: any) {
      console.error(`OAuth callback error for ${platform}:`, {
        error: error.response?.data || error.message,
        code,
        state,
      });
      if (error.message.includes('duplicate key error collection')) {
        throw new Error('Duplicate platforms not allowed!');
      }
      let errorMessage = extractErrorMessage(error as AxiosError);
      throw new Error(`OAuth callback failed for ${platform}: ${errorMessage || error.message}`);
    }
  }

  /**
   * Refreshes an access token using a refresh token
   * @param connection Existing social connection
   * @returns Updated SocialConnection object
   */
  async refreshToken(connection: SocialConnection): Promise<SocialConnection> {
    if (!connection.refreshToken) {
      throw new Error('No refresh token available');
    }

    const config = OAUTH_CONFIGS[connection.platform];
    const refreshToken = decrypt(connection.refreshToken);
    console.log('Refersh Token: ', refreshToken);

    let headers: { [key: string]: string } = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    if (connection.platform === SocialPlatform.TWITTER) {
      // Add Basic Auth header for confidential client
      const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString(
        'base64',
      );
      headers['Authorization'] = `Basic ${authHeader}`;
    }

    try {
      const response = await axios.post(config.tokenUrl, params, {
        headers,
      });

      console.log('Res data: ', response.data);

      const updatedConnection = await SocialConnectionModel.findOneAndUpdate(
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
        throw new Error('Connection details not updated');
      }

      return updatedConnection;
    } catch (error: any) {
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
  private async exchangeCodeForToken(
    code: string,
    config: OAuthConfig,
    platform: SocialPlatform,
    state?: string,
  ): Promise<any> {
    if (platform === SocialPlatform.LINKEDIN) {
      const { authClient } = this.setUpLinkedinClient();
      return authClient.exchangeAuthCodeForAccessToken(code);
    }

    const params = new URLSearchParams({
      code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    });

    // Add code_verifier for Twitter PKCE
    let headers: { [key: string]: string } = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (platform === SocialPlatform.TWITTER) {
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
      const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString(
        'base64',
      );
      headers['Authorization'] = `Basic ${authHeader}`;
    } else if (platform === SocialPlatform.TIKTOK) {
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
    } else {
      // For non-Twitter platforms, include client_id and client_secret in body
      params.append('client_id', config.clientId);
      params.append('client_secret', config.clientSecret);
    }

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
  private async getUserInfo(accessToken: string, platform: SocialPlatform): Promise<any> {
    const endpoints = {
      [SocialPlatform.FACEBOOK]: 'https://graph.facebook.com/me?fields=id,name',
      [SocialPlatform.INSTAGRAM]: 'https://graph.facebook.com/me?fields=id,name',
      [SocialPlatform.TWITTER]: 'https://api.twitter.com/2/users/me',
      [SocialPlatform.YOUTUBE]: 'https://www.googleapis.com/oauth2/v2/userinfo',
      [SocialPlatform.LINKEDIN]: 'https://api.linkedin.com/v2/userinfo',
      [SocialPlatform.TIKTOK]:
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name',
      [SocialPlatform.PINTEREST]: 'https://api.pinterest.com/v5/user_account',
    };

    try {
      if (platform === SocialPlatform.LINKEDIN) {
        const { restliClient } = this.setUpLinkedinClient();
        const response = await restliClient.get({
          resourcePath: '/userinfo',
          accessToken,
        });
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
  private generateState(orgId: string, platform: SocialPlatform): string {
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
  private parseState(state: string): {
    orgId: string;
    platform: SocialPlatform;
  } {
    try {
      const data = JSON.parse(Buffer.from(state, 'base64').toString());
      return {
        orgId: data.orgId,
        platform: data.platform,
      };
    } catch (error) {
      console.error('Error parsing state:', error);
      throw new Error('Invalid state parameter');
    }
  }

  /**
   * Generates PKCE code verifier
   * @returns Code verifier
   */
  private generateCodeVerifier(): string {
    return crypto.randomBytes(64).toString('base64url');
  }

  /**
   * Generates PKCE code challenge from verifier
   * @param verifier Code verifier
   * @returns Code challenge
   */
  private generateCodeChallenge(verifier: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(verifier);
    return hash.digest().toString('base64url').replace(/=/g, '');
  }

  async revokeConnection(connection: SocialConnection) {
    await SocialConnectionModel.findByIdAndDelete(connection._id);
  }
}

export default new OAuthService();
