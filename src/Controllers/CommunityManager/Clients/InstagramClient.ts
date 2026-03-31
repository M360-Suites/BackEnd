import { ComPlatformClient } from './ComPlatformClient';
import {
  ComConInterface,
  CommunityInterface,
  CommunityPostInterface,
  CommunityMember,
  ComPlatform,
  CommunityType,
  CommunityPermission,
  PostStatusCM,
} from '../../../Types/types';
import { Community, CommunityConnection, CommunityPost } from '../../../Models/CommunityModels';
import comOauth from '../Auth/oauth';
import axios from 'axios';

export class InstagramService extends ComPlatformClient {
  constructor() {
    super(ComPlatform.INSTAGRAM);
  }

  async connectAccount(userId: string, authCode: string, state?: string): Promise<ComConInterface> {
    if (!state) {
      throw new Error('State parameter is required for Instagram OAuth');
    }

    const connection = await comOauth.handleCallback(authCode, state);
    return connection;
  }

  async disconnectAccount(connectionId: string): Promise<void> {
    const connection = await CommunityConnection.findById(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    await comOauth.revokeConnection(connection);
  }

  async fetchCommunities(connection: ComConInterface): Promise<CommunityInterface[]> {
    const accessToken = this.getAccessToken(connection);

    try {
      const communities: CommunityInterface[] = [];

      // Fetch Instagram Business Accounts
      const accountsResponse = await this.makeApiRequest({
        method: 'GET',
        url: 'https://graph.facebook.com/v23.0/me/accounts',
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          fields: 'id,name,access_token,instagram_business_account',
          limit: 100,
        },
      });

      for (const page of accountsResponse.data) {
        if (page.instagram_business_account) {
          // Get Instagram account details
          const igResponse = await this.makeApiRequest({
            method: 'GET',
            url: `https://graph.facebook.com/v23.0/${page.instagram_business_account.id}`,
            headers: { Authorization: `Bearer ${accessToken}` },
            params: {
              fields:
                'id,username,profile_picture_url,name,biography,followers_count,follows_count,media_count',
            },
          });

          const community = await Community.findOneAndUpdate(
            {
              userId: connection.userId,
              platform: ComPlatform.INSTAGRAM,
              platformCommunityId: igResponse.id,
            },
            {
              userId: connection.userId,
              platform: ComPlatform.INSTAGRAM,
              platformCommunityId: igResponse.id,
              name: igResponse.username,
              description: igResponse.biography,
              avatar: igResponse.profile_picture_url,
              type: CommunityType.PAGE,
              memberCount: igResponse.followers_count,
              permissions: [CommunityPermission.WRITE, CommunityPermission.ADMIN],
              metadata: {
                pageId: page.id,
                pageAccessToken: page.access_token,
                username: igResponse.username,
                name: igResponse.name,
                mediaCount: igResponse.media_count,
              },
              isActive: true,
              lastSyncedAt: new Date(),
            },
            { upsert: true, new: true },
          );

          communities.push(community);
        }
      }

      return communities;
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.INSTAGRAM);
    }
  }

  async getCommunityDetails(
    connection: ComConInterface,
    communityId: string,
  ): Promise<CommunityInterface> {
    const community = await Community.findOne({
      _id: communityId,
      platform: ComPlatform.INSTAGRAM,
      userId: connection.userId,
    });

    if (!community) {
      throw new Error('Community not found');
    }

    return community;
  }

  async createPost(
    connection: ComConInterface,
    communityId: string,
    postData: CommunityPostInterface,
  ): Promise<any> {
    const community = await this.getCommunityDetails(connection, communityId);
    const pageAccessToken = community.metadata?.pageAccessToken;
    const igUserId = community.platformCommunityId;

    if (!pageAccessToken) {
      throw new Error('Page access token not found');
    }

    try {
      let response;

      if (postData.content.media && postData.content.media.length > 0) {
        // Instagram requires media upload
        const media = postData.content.media[0];

        // Create media container
        const containerResponse = await this.makeApiRequest({
          method: 'POST',
          url: `https://graph.facebook.com/v23.0/${igUserId}/media`,
          params: {
            access_token: pageAccessToken,
            image_url: media.url,
            caption: postData.content.text || '',
          },
        });

        // Publish the media
        response = await this.makeApiRequest({
          method: 'POST',
          url: `https://graph.facebook.com/v23.0/${igUserId}/media_publish`,
          params: {
            access_token: pageAccessToken,
            creation_id: containerResponse.id,
          },
        });
      } else {
        // Instagram requires media, cannot post text-only
        throw new Error('Instagram requires media for posts');
      }

      // Save the post
      const post = await CommunityPost.create({
        communityId: community._id,
        platform: ComPlatform.INSTAGRAM,
        platformPostId: response.id,
        content: postData.content,
        status: PostStatusCM.POSTED,
        postedAt: new Date(),
        createdBy: connection.userId,
        metadata: {
          instagramMediaId: response.id,
        },
      });

      return {
        success: true,
        mediaId: response.id,
        localPostId: post._id,
      };
    } catch (error: any) {
      // Save failed post
      await CommunityPost.create({
        communityId: community._id,
        platform: ComPlatform.INSTAGRAM,
        content: postData.content,
        status: PostStatusCM.FAILED,
        error: error.message,
        createdBy: connection.userId,
      });

      this.handlePlatformError(error, ComPlatform.INSTAGRAM);
    }
  }

  async updatePost(
    connection: ComConInterface,
    postId: string,
    postData: Partial<CommunityPostInterface>,
  ): Promise<any> {
    // Instagram doesn't support updating posts
    // We can only update the local record
    const post = await CommunityPost.findOneAndUpdate(
      {
        _id: postId,
        platform: ComPlatform.INSTAGRAM,
      },
      {
        content: postData.content,
        status: postData.status,
        error: postData.error,
      },
      { new: true },
    );

    if (!post) {
      throw new Error('Post not found');
    }

    return post;
  }

  async deletePost(connection: ComConInterface, postId: string): Promise<any> {
    const post = await CommunityPost.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    if (!post.platformPostId) {
      throw new Error('Platform post ID not found');
    }

    const community = await Community.findById(post.communityId);
    const pageAccessToken = community?.metadata?.pageAccessToken;

    try {
      await this.makeApiRequest({
        method: 'DELETE',
        url: `https://graph.facebook.com/v23.0/${post.platformPostId}`,
        params: { access_token: pageAccessToken },
      });

      // Delete from local database
      await CommunityPost.findByIdAndDelete(postId);

      return { success: true, message: 'Post deleted successfully' };
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.INSTAGRAM);
    }
  }

  async schedulePost(
    connection: ComConInterface,
    communityId: string,
    postData: CommunityPostInterface,
    scheduleTime: Date,
  ): Promise<any> {
    const community = await this.getCommunityDetails(connection, communityId);

    // Create scheduled post
    const post = await CommunityPost.create({
      communityId: community._id,
      platform: ComPlatform.INSTAGRAM,
      content: postData.content,
      scheduledAt: scheduleTime,
      status: PostStatusCM.SCHEDULED,
      createdBy: connection.userId,
    });

    return {
      success: true,
      postId: post._id,
      scheduledAt: scheduleTime,
    };
  }

  async fetchMembers(
    connection: ComConInterface,
    communityId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<CommunityMember[]> {
    // Instagram doesn't provide follower list via API
    return [];
  }

  async removeMember(
    connection: ComConInterface,
    communityId: string,
    memberId: string,
  ): Promise<any> {
    // Instagram doesn't support removing followers via API
    throw new Error('Instagram API does not support removing followers');
  }

  async sendMessage(
    connection: ComConInterface,
    to: string,
    message: any,
    options?: any,
  ): Promise<any> {
    // Instagram messaging is limited and requires specific permissions
    throw new Error('Instagram messaging API is limited and requires specific permissions');
  }

  async refreshToken(connection: ComConInterface): Promise<ComConInterface> {
    return await comOauth.refreshToken(connection);
  }

  // Instagram-specific methods
  async getMediaInsights(connection: ComConInterface, mediaId: string): Promise<any> {
    const community = await Community.findOne({
      userId: connection.userId,
      platform: ComPlatform.INSTAGRAM,
    });
    const pageAccessToken = community?.metadata?.pageAccessToken;

    if (!pageAccessToken) {
      throw new Error('Page access token not found');
    }

    try {
      const response = await this.makeApiRequest({
        method: 'GET',
        url: `https://graph.facebook.com/v23.0/${mediaId}/insights`,
        params: {
          access_token: pageAccessToken,
          metric: 'engagement,impressions,reach,saved',
        },
      });

      return response;
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.INSTAGRAM);
    }
  }
}
