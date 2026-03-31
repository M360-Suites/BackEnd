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
import { CommunityConnection, Community, CommunityPost } from '../../../Models/CommunityModels';
import comOauth from '../Auth/oauth';
import axios from 'axios';

export class FacebookService extends ComPlatformClient {
  constructor() {
    super(ComPlatform.FACEBOOK);
  }

  async connectAccount(userId: string, authCode: string, state?: string): Promise<ComConInterface> {
    if (!state) {
      throw new Error('State parameter is required for Facebook OAuth');
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

      // Fetch Facebook Pages
      const pagesResponse = await this.makeApiRequest({
        method: 'GET',
        url: 'https://graph.facebook.com/v23.0/me/accounts',
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          fields: 'id,name,picture,access_token,perms,category,tasks',
          limit: 100,
        },
      });

      for (const page of pagesResponse.data) {
        const community = await Community.findOneAndUpdate(
          {
            orgId: connection.orgId,
            platform: ComPlatform.FACEBOOK,
            platformCommunityId: page.id,
          },
          {
            userId: connection.userId,
            orgId: connection.orgId,
            platform: ComPlatform.FACEBOOK,
            platformCommunityId: page.id,
            name: page.name,
            avatar: page.picture?.data?.url,
            type: CommunityType.PAGE,
            permissions: page.perms || [CommunityPermission.WRITE],
            metadata: {
              accessToken: page.access_token,
              category: page.category,
              tasks: page.tasks,
            },
            isActive: true,
            lastSyncedAt: new Date(),
          },
          { upsert: true, new: true },
        );

        communities.push(community);
      }

      // Fetch Facebook Groups
      try {
        const groupsResponse = await this.makeApiRequest({
          method: 'GET',
          url: 'https://graph.facebook.com/v23.0/me/groups',
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            fields: 'id,name,description,cover,administrator,member_count,privacy',
            limit: 100,
          },
        });

        for (const group of groupsResponse.data) {
          const community = await Community.findOneAndUpdate(
            {
              orgId: connection.orgId,
              platform: ComPlatform.FACEBOOK,
              platformCommunityId: group.id,
            },
            {
              userId: connection.userId,
              orgId: connection.orgId,
              platform: ComPlatform.FACEBOOK,
              platformCommunityId: group.id,
              name: group.name,
              description: group.description,
              avatar: group.cover?.source,
              type: CommunityType.GROUP,
              memberCount: group.member_count,
              permissions: group.administrator
                ? [CommunityPermission.ADMIN]
                : [CommunityPermission.WRITE],
              metadata: {
                privacy: group.privacy,
                administrator: group.administrator,
              },
              isActive: true,
              lastSyncedAt: new Date(),
            },
            { upsert: true, new: true },
          );

          communities.push(community);
        }
      } catch (groupsError: any) {
        console.log('User may not have groups permission:', groupsError.message);
      }

      return communities;
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.FACEBOOK);
    }
  }

  async getCommunityDetails(
    connection: ComConInterface,
    communityId: string,
  ): Promise<CommunityInterface> {
    const community = await Community.findOne({
      _id: communityId,
      platform: ComPlatform.FACEBOOK,
      orgId: connection.orgId,
    });

    if (!community) {
      throw new Error('Community not found');
    }

    // Fetch fresh details from Facebook
    const accessToken = community.metadata?.accessToken || this.getAccessToken(connection);

    try {
      const response = await this.makeApiRequest({
        method: 'GET',
        url: `https://graph.facebook.com/v23.0/${community.platformCommunityId}`,
        params: {
          access_token: accessToken,
          fields: 'id,name,about,cover,link,fan_count,engagement,is_verified',
        },
      });

      // Update community with fresh data
      community.name = response.name || community.name;
      community.description = response.about || community.description;
      community.avatar = response.cover?.source || community.avatar;
      community.memberCount = response.fan_count || community.memberCount;
      community.metadata = {
        ...community.metadata,
        ...response,
        lastUpdated: new Date(),
      };

      await community.save();

      return community;
    } catch (error) {
      console.error('Error fetching community details:', error);
      return community; // Return cached data
    }
  }

  async createPost(
    connection: ComConInterface,
    communityId: string,
    postData: CommunityPostInterface,
  ): Promise<any> {
    const community = await this.getCommunityDetails(connection, communityId);
    const pageAccessToken = community.metadata?.accessToken;

    if (!pageAccessToken) {
      throw new Error('Page access token not found');
    }

    try {
      let endpoint: string;
      let params: any = {
        access_token: pageAccessToken,
        message: postData.content.text,
      };

      if (community.type === CommunityType.PAGE) {
        endpoint = `https://graph.facebook.com/v23.0/${community.platformCommunityId}/feed`;
      } else if (community.type === CommunityType.GROUP) {
        endpoint = `https://graph.facebook.com/v23.0/${community.platformCommunityId}/feed`;
        params.access_token = this.getAccessToken(connection);
      } else {
        throw new Error('Unsupported community type');
      }

      // Add link if present
      if (postData.content.link) {
        params.link = postData.content.link;
      }

      // Handle media upload
      if (postData.content.media && postData.content.media.length > 0) {
        for (const media of postData.content.media) {
          if (media.type === 'image') {
            endpoint = `https://graph.facebook.com/v23.0/${community.platformCommunityId}/photos`;
            params.url = media.url;
            params.caption = postData.content.text;
            delete params.message;
            delete params.link;
          } else if (media.type === 'video') {
            endpoint = `https://graph.facebook.com/v23.0/${community.platformCommunityId}/videos`;
            params.file_url = media.url;
            params.description = postData.content.text;
            delete params.message;
            delete params.link;
          }
        }
      }

      const response = await this.makeApiRequest({
        method: 'POST',
        url: endpoint,
        params,
      });

      // Save the post
      const post = await CommunityPost.create({
        communityId: community._id,
        platform: ComPlatform.FACEBOOK,
        platformPostId: response.id || response.post_id,
        content: postData.content,
        status: PostStatusCM.POSTED,
        postedAt: new Date(),
        createdBy: connection.userId,
        metadata: {
          facebookPostId: response.id || response.post_id,
          ...response,
        },
      });

      return {
        success: true,
        postId: response.id || response.post_id,
        localPostId: post._id,
      };
    } catch (error: any) {
      // Save failed post
      await CommunityPost.create({
        communityId: community._id,
        platform: ComPlatform.FACEBOOK,
        content: postData.content,
        status: PostStatusCM.FAILED,
        error: error.message,
        createdBy: connection.userId,
      });

      this.handlePlatformError(error, ComPlatform.FACEBOOK);
    }
  }

  async updatePost(
    connection: ComConInterface,
    postId: string,
    postData: Partial<CommunityPostInterface>,
  ): Promise<any> {
    const post = await CommunityPost.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Facebook only allows updating certain fields like message
    if (postData.content?.text && post.platformPostId) {
      const community = await Community.findById(post.communityId);
      const accessToken = community?.metadata?.accessToken || this.getAccessToken(connection);

      try {
        await this.makeApiRequest({
          method: 'POST',
          url: `https://graph.facebook.com/v23.0/${post.platformPostId}`,
          params: {
            access_token: accessToken,
            message: postData.content.text,
          },
        });
      } catch (error) {
        console.error('Error updating Facebook post:', error);
      }
    }

    // Update local post
    const updatedPost = await CommunityPost.findByIdAndUpdate(
      postId,
      {
        content: postData.content,
        status: postData.status || post.status,
        error: postData.error,
      },
      { new: true },
    );

    return updatedPost;
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
    const accessToken = community?.metadata?.accessToken || this.getAccessToken(connection);

    try {
      await this.makeApiRequest({
        method: 'DELETE',
        url: `https://graph.facebook.com/v23.0/${post.platformPostId}`,
        params: { access_token: accessToken },
      });

      // Delete from local database
      await CommunityPost.findByIdAndDelete(postId);

      return { success: true, message: 'Post deleted successfully' };
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.FACEBOOK);
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
      platform: ComPlatform.FACEBOOK,
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
    const community = await this.getCommunityDetails(connection, communityId);
    const accessToken = community.metadata?.accessToken || this.getAccessToken(connection);

    try {
      let endpoint: string;

      if (community.type === CommunityType.PAGE) {
        endpoint = `https://graph.facebook.com/v23.0/${community.platformCommunityId}/likes`;
      } else if (community.type === CommunityType.GROUP) {
        endpoint = `https://graph.facebook.com/v23.0/${community.platformCommunityId}/members`;
      } else {
        return [];
      }

      const response = await this.makeApiRequest({
        method: 'GET',
        url: endpoint,
        params: {
          access_token: accessToken,
          limit,
          offset,
          fields: 'id,name,administrator',
        },
      });

      return response.data.map((member: any) => ({
        memberId: member.id,
        name: member.name,
        role: member.administrator ? CommunityPermission.ADMIN : CommunityPermission.MEMBER,
        joinedAt: new Date(), // Facebook doesn't provide join date
      }));
    } catch (error: any) {
      console.error('Error fetching members:', error.message);
      return [];
    }
  }

  async removeMember(
    connection: ComConInterface,
    communityId: string,
    memberId: string,
  ): Promise<any> {
    // Only possible for groups and only if admin
    const community = await this.getCommunityDetails(connection, communityId);

    if (community.type !== CommunityType.GROUP) {
      throw new Error('Can only remove members from groups');
    }

    const accessToken = this.getAccessToken(connection);

    try {
      await this.makeApiRequest({
        method: 'DELETE',
        url: `https://graph.facebook.com/v23.0/${community.platformCommunityId}/members`,
        params: {
          access_token: accessToken,
          member: memberId,
        },
      });

      return { success: true, message: 'Member removed successfully' };
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.FACEBOOK);
    }
  }

  async sendMessage(
    connection: ComConInterface,
    to: string,
    message: any,
    options?: any,
  ): Promise<any> {
    // Facebook messaging via Messenger API
    const accessToken = this.getAccessToken(connection);

    try {
      const response = await this.makeApiRequest({
        method: 'POST',
        url: `https://graph.facebook.com/v23.0/me/messages`,
        params: {
          access_token: accessToken,
        },
        data: {
          recipient: { id: to },
          message: {
            text: message.text,
          },
          messaging_type: 'RESPONSE',
        },
      });

      return {
        success: true,
        messageId: response.message_id,
        recipientId: response.recipient_id,
      };
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.FACEBOOK);
    }
  }

  async refreshToken(connection: ComConInterface): Promise<ComConInterface> {
    return await comOauth.refreshToken(connection);
  }

  // Facebook-specific methods
  async getPageInsights(
    connection: ComConInterface,
    pageId: string,
    metric: string,
    period: string = 'day',
  ): Promise<any> {
    const accessToken = this.getAccessToken(connection);

    try {
      const response = await this.makeApiRequest({
        method: 'GET',
        url: `https://graph.facebook.com/v23.0/${pageId}/insights`,
        params: {
          access_token: accessToken,
          metric,
          period,
        },
      });

      return response;
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.FACEBOOK);
    }
  }
}
