import { SocialConnectionModel } from '../../../Models/SocialModels';
import { decrypt } from '../../../Services/encryption';
import oauthService from '../Auth/oauth-service';
import { PostContent, PostResult, SocialConnection, SocialPlatform } from '../../../Types/types';
import { BasePoster } from './basePoster';
import { FacebookPoster } from './facebookPoster';
import { InstagramPoster } from './instaPoster';
import { LinkedInPoster } from './linkedInPoster';
import { PinterestPoster } from './pinterestPoster';
import { TikTokPoster } from './tiktokPoster';
import { TwitterPoster } from './twitterPoster';
import { YouTubePoster } from './youtubePoster';
import { isOauthTokenExpired } from '../../../Services/tokenService';

export const post = async (
  orgId: string,
  platform: SocialPlatform,
  content: PostContent,
): Promise<PostResult> => {
  try {
    let connection = (await SocialConnectionModel.findOne({
      orgId,
      platform,
    })) as SocialConnection;
    if (!connection) throw new Error(`No authentication found for platform '${platform}'`);

    // console.log('Initial connection: ', connection);
    // console.log('Access token: ', decrypt(connection.accessToken));

    // Check if token needs refresh
    if (isOauthTokenExpired(connection)) {
      try {
        console.log('Token expired, refreshing...');
        const refreshedConnection = await oauthService.refreshToken(connection);
        // console.log("Refershed connection: ", refreshedConnection);
        // console.log('New accessToken: ', decrypt(refreshedConnection.accessToken));

        // Update the connection with the refreshed token
        connection = refreshedConnection;
      } catch (err: any) {
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
  } catch (error: any) {
    console.log(`Error posting to ${platform}: ${error}`);
    // throw new Error(error.message);
    return {
      success: false,
      error: error.message,
      platform,
    };
  }
};

export const postToMultiplePlatforms = async (
  orgId: string,
  platforms: SocialPlatform[],
  content: PostContent,
): Promise<PostResult[]> => {
  const promises = platforms.map((platform) => post(orgId, platform, content));

  return await Promise.all(promises);
};

const createPoster = (platform: SocialPlatform, connection: SocialConnection): BasePoster => {
  switch (platform) {
    case SocialPlatform.FACEBOOK:
      return new FacebookPoster(connection);
    case SocialPlatform.INSTAGRAM:
      return new InstagramPoster(connection);
    case SocialPlatform.LINKEDIN:
      return new LinkedInPoster(connection);
    case SocialPlatform.PINTEREST:
      return new PinterestPoster(connection);
    case SocialPlatform.TIKTOK:
      return new TikTokPoster(connection);
    case SocialPlatform.TWITTER:
      return new TwitterPoster(connection);
    case SocialPlatform.YOUTUBE:
      return new YouTubePoster(connection);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
};
