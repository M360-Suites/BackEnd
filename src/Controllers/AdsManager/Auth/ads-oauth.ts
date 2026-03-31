import { AuthClient, RestliClient } from "linkedin-api-client";
import {
  AdOAuthConfig,
  AdsConnection,
  AdsPlatform,
} from "../../../Types/ads";
import { ADS_CONFIGS } from "./ads-oauth-configs";
import { AdsConModel } from "../../../Models/AdModels";
import { decrypt, encrypt } from "../../../Services/encryption";
import { extractErrorMessage } from "../../../helpers/axiosError";
import axios, { AxiosError } from "axios";
import crypto from "crypto";
import qs from "qs";

class AdsOauth {
  private requestTokenData: Map<
    string,
    { requestToken: string; requestTokenSecret: string; state: string }
  > = new Map();

  private codeVerifiers: Map<string, string> = new Map();

  setUpLinkedinClient(): {
    authClient: AuthClient;
    restliClient: RestliClient;
  } {
    const clientUrl = process.env.CLIENT_URL!;
    const platform = 'linkedin';
    const config = ADS_CONFIGS[platform];

    const authClient = new AuthClient({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUrl: `${clientUrl}/ads-auth/callback`,
    });
    const restliClient = new RestliClient();
    restliClient.setDebugParams({ enabled: true });

    return { authClient, restliClient };
  }

  async generateAuthUrl(
    platform: AdsPlatform,
    orgId: string,
  ): Promise<{ url: string; csrfState: Uint8Array }> {
    let array = new Uint8Array(30);
    const csrfState = crypto.getRandomValues(array);
    const config = ADS_CONFIGS[platform];
    const state = this.generateState(orgId, platform);

    if (platform === AdsPlatform.TWITTER) {
      return await this.generateTwitterOAuth1Url(state);
    } else if (platform === AdsPlatform.TIKTOK) {
      let url = new URL('https://www.tiktok.com/v2/auth/authorize');
      let codeVerifier = this.generateCodeVerifier();
      let codeChallenge = this.generateCodeChallenge(codeVerifier);

      this.codeVerifiers.set(state, codeVerifier);
      console.log(`TikTok: Stored code_verifier for state ${state}: ${codeVerifier}`);

      url.searchParams.append('client_key', config.clientId);
      url.searchParams.append(
        'scope',
        'user.info.basic,video.upload,video.publish,user.info.profile',
      );
      url.searchParams.append('response_type', 'code');
      url.searchParams.append('redirect_uri', config.redirectUri);
      url.searchParams.append('state', state);
      url.searchParams.append('disable_auto_auth', '1');
      url.searchParams.append('code_challenge', codeChallenge);
      url.searchParams.append('code_challenge_method', 'S256');

      console.log(`TikTok: Generated auth URL: ${url.toString()}`);
      return { url: url.toString(), csrfState };
    } else if (platform === AdsPlatform.LINKEDIN) {
      const { authClient } = this.setUpLinkedinClient();
      const url = authClient.generateMemberAuthorizationUrl(config.scopes, state);
      console.log(`LinkedIn: Generated auth URL: ${url}`);
      return { url, csrfState };
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      response_type: 'code',
      prompt: 'consent',
      access_type: 'offline',
      state: state,
    });

    const authUrl = `${config.authUrl}?${params.toString()}`;
    console.log(`Default: Generated auth URL: ${authUrl}`);
    return { url: authUrl, csrfState };
  }

  private async generateTwitterOAuth1Url(
    state: string,
  ): Promise<{ url: string; csrfState: Uint8Array }> {
    const consumerKey = process.env.TWITTER_CONSUMER_KEY!;
    const consumerSecret = process.env.TWITTER_CONSUMER_SECRET!;
    const config = ADS_CONFIGS[AdsPlatform.TWITTER];

    if (!consumerKey || !consumerSecret) {
      throw new Error('Missing Twitter consumer key or secret in environment variables');
    }

    const oauthParams = {
      oauth_callback: config.redirectUri,
      oauth_consumer_key: consumerKey,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0',
    };

    const signature = this.generateOAuth1Signature(
      'POST',
      'https://api.twitter.com/oauth/request_token',
      oauthParams,
      consumerSecret,
      '',
    );

    console.log('Sig: ', signature);

    const authHeader = Object.entries(oauthParams)
      .concat([['oauth_signature', signature]])
      .map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
      .join(', ');

    const fullAuthHeader = `OAuth ${authHeader}`;

    try {
      const response = await axios.post('https://api.twitter.com/oauth/request_token', null, {
        headers: {
          Authorization: fullAuthHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const tokenData = qs.parse(response.data);
      console.log('Got data: ', tokenData);
      const requestToken = tokenData.oauth_token as string;
      const requestTokenSecret = tokenData.oauth_token_secret as string;

      this.requestTokenData.set(state, {
        requestToken,
        requestTokenSecret,
        state,
      });

      console.log(`Twitter Ads: Obtained request_token for state ${state}: ${requestToken}`);

      const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${requestToken}&oauth_callback=${encodeURIComponent(
        config.redirectUri,
      )}`;

      let array = new Uint8Array(30);
      const csrfState = crypto.getRandomValues(array);

      return { url: authUrl, csrfState };
    } catch (error: any) {
      console.error('Twitter OAuth 1.0a request token error:', {
        error: error.response?.data?.errors || error.message,
        status: error.response?.status,
      });
      throw new Error(
        `Twitter OAuth Error: ${error.response?.data?.errors[0].message || error.message}`,
      );
    }
  }

  async handleCallback(
    code: string,
    state: string,
    oauthToken?: string,
    oauthVerifier?: string,
  ): Promise<AdsConnection> {
    const { orgId, platform } = this.parseState(state);
    const config = ADS_CONFIGS[platform];

    try {
      let tokenResponse: any;
      let accessToken: string;
      let accessTokenSecret: string | undefined;
      let refreshToken: string | undefined;
      let expiresIn: number | undefined;
      let userInfo: { id: string; name: string; [key: string]: any } = {
        id: '',
        name: '',
      };

      if (platform === AdsPlatform.TWITTER && oauthToken && oauthVerifier) {
        // Twitter OAuth 1.0a flow
        console.log(
          `Handling Twitter OAuth 1.0a callback with oauth_token: ${oauthToken}, oauth_verifier: ${oauthVerifier}`,
        );
        tokenResponse = await this.exchangeTwitterOAuth1Token(oauthToken, oauthVerifier, state);
        accessToken = tokenResponse.oauth_token;
        accessTokenSecret = tokenResponse.oauth_token_secret;
        userInfo.id = tokenResponse.user_id;
        userInfo.name = tokenResponse.screen_name;
      } else if (code && state) {
        // OAuth 2.0 flow for other platforms
        console.log(`Handling OAuth 2.0 callback with code: ${code}, state: ${state}`);
        tokenResponse = await this.exchangeCodeForToken(code, config, platform, state);
        console.log('Token res: ', tokenResponse);
        accessToken = tokenResponse.access_token;
        refreshToken = tokenResponse.refresh_token;
        expiresIn = tokenResponse.expires_in;
      } else {
        throw new Error('Missing required parameters for authentication');
      }

      if (platform !== AdsPlatform.TWITTER) {
        userInfo = await this.getUserInfo(accessToken, platform);
      }

      const connection = await AdsConModel.findOneAndUpdate(
        { orgId, platform },
        {
          orgId,
          platform,
          accessToken: encrypt(accessToken),
          accessTokenSecret: accessTokenSecret ? encrypt(accessTokenSecret) : undefined,
          refreshToken: refreshToken ? encrypt(refreshToken) : undefined,
          expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
          refreshExpiresAt: tokenResponse.refresh_token_expires_in
            ? new Date(Date.now() + tokenResponse.refresh_token_expires_in * 1000)
            : undefined,
          accountId: userInfo.id || userInfo.data?.id,
          accountName: userInfo.name || userInfo.data?.name,
          scopes: config.scopes,
        },
        { upsert: true, new: true },
      );

      if (!connection) throw new Error('Connection not saved');

      // Clean up stored data
      if (platform === AdsPlatform.TWITTER) {
        this.requestTokenData.delete(state);
      } else {
        this.codeVerifiers.delete(state);
      }

      return connection;
    } catch (error: any) {
      console.error(`OAuth callback error for ${platform}:`, {
        error: error.response?.data || error.message,
        code,
        state,
        oauthToken,
        oauthVerifier,
      });
      if (error.message.includes('duplicate key error collection')) {
        throw new Error('Duplicate platforms not allowed!');
      }
      let errorMessage = extractErrorMessage(error as AxiosError);
      throw new Error(`OAuth callback failed for ${platform}: ${errorMessage || error.message}`);
    }
  }

  private async exchangeTwitterOAuth1Token(
    oauthToken: string,
    oauthVerifier: string,
    state: string,
  ): Promise<any> {
    const consumerKey = process.env.TWITTER_CONSUMER_KEY!;
    const consumerSecret = process.env.TWITTER_CONSUMER_SECRET!;

    const requestTokenData = this.requestTokenData.get(state);
    if (!requestTokenData || requestTokenData.requestToken !== oauthToken) {
      throw new Error('Invalid OAuth token or state');
    }

    const oauthParams = {
      oauth_consumer_key: consumerKey,
      oauth_token: oauthToken,
      oauth_verifier: oauthVerifier,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0',
    };

    const signature = this.generateOAuth1Signature(
      'POST',
      'https://api.twitter.com/oauth/access_token',
      oauthParams,
      consumerSecret,
      requestTokenData.requestTokenSecret,
    );

    const authHeader = Object.entries(oauthParams)
      .concat([['oauth_signature', signature]])
      .map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
      .join(', ');

    const fullAuthHeader = `OAuth ${authHeader}`;

    try {
      const response = await axios.post('https://api.twitter.com/oauth/access_token', null, {
        headers: {
          Authorization: fullAuthHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const tokenData = qs.parse(response.data);
      console.log('Obtained tokens: ', {
        token: tokenData.oauth_token,
        secret: tokenData.oauth_token_secret,
      });

      console.log(
        `Twitter Ads: Successfully obtained access token: ${tokenData.oauth_token} for user ${tokenData.screen_name}`,
      );

      return {
        oauth_token: tokenData.oauth_token,
        oauth_token_secret: tokenData.oauth_token_secret,
        user_id: tokenData.user_id,
        screen_name: tokenData.screen_name,
      };
    } catch (error: any) {
      console.error('Twitter OAuth 1.0a access token error:', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  private generateOAuth1Signature(
    method: string,
    url: string,
    params: { [key: string]: string },
    consumerSecret: string,
    tokenSecret: string,
  ): string {
    const encodedParams = Object.keys(params)
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(encodedParams)}`;

    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

    const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

    return signature;
  }

  async refreshToken(connection: AdsConnection): Promise<AdsConnection> {
    if (connection.platform === AdsPlatform.TWITTER) {
      throw new Error('OAuth 1.0 tokens cannot be refreshed. Please re-authenticate.');
    }

    if (!connection.refreshToken) {
      throw new Error('No refresh token available');
    }

    const config = ADS_CONFIGS[connection.platform];
    const refreshToken = decrypt(connection.refreshToken);

    const headers: { [key: string]: string } = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    try {
      const response = await axios.post(config.tokenUrl, params, {
        headers,
      });

      console.log('Refresh token response:', response.data);

      const updatedConnection = await AdsConModel.findOneAndUpdate(
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

  private async exchangeCodeForToken(
    code: string,
    config: AdOAuthConfig,
    platform: AdsPlatform,
    state?: string,
  ): Promise<any> {
    if (platform === AdsPlatform.LINKEDIN) {
      const { authClient } = this.setUpLinkedinClient();
      return authClient.exchangeAuthCodeForAccessToken(code);
    }

    const params = new URLSearchParams({
      code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    });

    const headers: { [key: string]: string } = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (platform === AdsPlatform.TIKTOK) {
      const codeVerifier = this.codeVerifiers.get(state!);
      if (!codeVerifier) {
        throw new Error(`Code verifier not found for state ${state}`);
      }
      params.append('client_key', config.clientId);
      params.append('client_secret', config.clientSecret);
      params.append('code_verifier', codeVerifier);
    } else {
      params.append('client_id', config.clientId);
      params.append('client_secret', config.clientSecret);
    }

    try {
      const response = await axios.post(config.tokenUrl, params, {
        headers,
      });
      // console.log(`Token exchange response for ${platform}:`, response.data);
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

  private async getUserInfo(accessToken: string, platform: AdsPlatform): Promise<any> {
    const endpoints = {
      [AdsPlatform.META]: 'https://graph.facebook.com/me?fields=id,name',
      [AdsPlatform.TWITTER]: 'https://api.twitter.com/2/users/me',
      [AdsPlatform.GOOGLE]: 'https://www.googleapis.com/oauth2/v2/userinfo',
      [AdsPlatform.LINKEDIN]: 'https://api.linkedin.com/v2/userinfo',
      [AdsPlatform.TIKTOK]: 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name',
      [AdsPlatform.SNAPCHAT]: 'https://api.pinterest.com/v5/user_account',
    };

    try {
      if (platform === AdsPlatform.LINKEDIN) {
        const { restliClient } = this.setUpLinkedinClient();
        const response = await restliClient.get({
          resourcePath: '/userinfo',
          accessToken,
        });
        // console.log('AT: ', accessToken);
        // const res = await axios.get(`https://api.linkedin.com/v2/me`, { //https://api.linkedin.com/v2/userinfo
        //   headers: {
        //     Authorization: `Bearer ${accessToken}`,
        //     "LinkedIn-Version": process.env.LinkedIn_Version,
        //   },
        // });
        return response.data;
      }

      if (platform === AdsPlatform.TWITTER) {
        const consumerKey = process.env.TWITTER_CONSUMER_KEY!;
        const consumerSecret = process.env.TWITTER_CONSUMER_SECRET!;

        const oauthParams = {
          oauth_consumer_key: consumerKey,
          oauth_token: accessToken,
          oauth_nonce: crypto.randomBytes(16).toString('hex'),
          oauth_signature_method: 'HMAC-SHA1',
          oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
          oauth_version: '1.0',
        };

        // Note: In a real implementation, you need the access token secret from the connection
        const signature = this.generateOAuth1Signature(
          'GET',
          endpoints[platform],
          oauthParams,
          consumerSecret,
          '', // Placeholder; replace with actual token secret
        );

        const authHeader = Object.entries(oauthParams)
          .concat([['oauth_signature', signature]])
          .map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
          .join(', ');

        const response = await axios.get(endpoints[platform], {
          headers: {
            Authorization: `OAuth ${authHeader}`,
          },
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

  private generateState(orgId: string, platform: AdsPlatform): string {
    const data = JSON.stringify({
      orgId,
      platform,
      timestamp: Date.now(),
    });
    return Buffer.from(data).toString('base64');
  }

  parseState(state: string): {
    orgId: string;
    platform: AdsPlatform;
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

  private generateCodeVerifier(): string {
    return crypto.randomBytes(64).toString('base64url');
  }

  private generateCodeChallenge(verifier: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(verifier);
    return hash.digest().toString('base64url').replace(/=/g, '');
  }

  getStateFromToken(oauth_token: string): string | undefined {
    for (const [state, data] of this.requestTokenData) {
      if (data.requestToken === oauth_token) {
        return state;
      }
    }
    return undefined;
  }

  async revokeConnection(connection: AdsConnection): Promise<any> {
    await AdsConModel.findByIdAndDelete(connection._id);
  }
}

export default new AdsOauth();
