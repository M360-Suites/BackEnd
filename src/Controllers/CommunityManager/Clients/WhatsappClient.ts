import { ComPlatformClient } from './ComPlatformClient';
import {
  ICommunityPlatformService,
  ComConInterface,
  CommunityInterface,
  CommunityPostInterface,
  CommunityMember,
  ComPlatform,
  CommunityType,
  CommunityPermission,
  PostStatusCM,
} from '../../../Types/types';
import {
  CommunityConnection,
  Community,
  CommunityPost,
  CommunityMember as CommunityMemberModel,
} from '../../../Models/CommunityModels';
import comOauth from '../Auth/oauth';
import { decrypt, encrypt } from '../../../Services/encryption';
import axios from 'axios';

export class WhatsAppService extends ComPlatformClient implements ICommunityPlatformService {
  constructor() {
    super(ComPlatform.WHATSAPP);
  }

  async connectAccount(authCode: string, state?: string): Promise<ComConInterface> {
    if (!state) {
      throw new Error('State parameter is required for WhatsApp OAuth');
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
    const businessAccountId = connection.metadata?.businessAccountId;

    if (!businessAccountId) {
      throw new Error('WhatsApp Business Account ID not found');
    }

    try {
      // WhatsApp doesn't have traditional communities, but we can treat phone numbers as communities
      const phoneNumbersResponse = await axios.get(
        `https://graph.facebook.com/v23.0/${businessAccountId}/phone_numbers`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const communities: CommunityInterface[] = [];

      for (const phoneNumber of phoneNumbersResponse.data.data) {
        const community = await Community.findOneAndUpdate(
          {
            orgId: connection.orgId,
            platform: ComPlatform.WHATSAPP,
            platformCommunityId: phoneNumber.id,
          },
          {
            userId: connection.userId,
            orgId: connection.orgId,
            platform: ComPlatform.WHATSAPP,
            platformCommunityId: phoneNumber.id,
            name: phoneNumber.display_phone_number || phoneNumber.phone_number,
            description: `WhatsApp Business Number: ${phoneNumber.display_phone_number}`,
            type: CommunityType.COMMUNITY,
            memberCount: 0, // WhatsApp doesn't provide member count
            permissions: [CommunityPermission.ADMIN, CommunityPermission.WRITE],
            metadata: {
              phoneNumber: phoneNumber.phone_number,
              displayPhoneNumber: phoneNumber.display_phone_number,
              verifiedName: phoneNumber.verified_name,
              qualityRating: phoneNumber.quality_rating,
              codeVerificationStatus: phoneNumber.code_verification_status,
            },
            isActive: true,
            lastSyncedAt: new Date(),
          },
          { upsert: true, new: true },
        );

        communities.push(community);
      }

      return communities;
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.WHATSAPP);
    }
  }

  async getCommunityDetails(
    connection: ComConInterface,
    communityId: string,
  ): Promise<CommunityInterface> {
    const community = await Community.findOne({
      _id: communityId,
      platform: ComPlatform.WHATSAPP,
      orgId: connection.orgId,
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
    const accessToken = this.getAccessToken(connection);
    const phoneNumberId = community.metadata?.phoneNumberId || connection.metadata?.phoneNumberId;

    if (!phoneNumberId) {
      throw new Error('WhatsApp phone number ID not found');
    }

    try {
      let response;

      if (postData.content.media && postData.content.media.length > 0) {
        // Send media message
        const media = postData.content.media[0];
        response = await this.sendMediaMessage(
          accessToken,
          phoneNumberId,
          community.metadata.phoneNumber,
          media,
          postData.content.text,
        );
      } else if (postData.content.text) {
        // Send text message
        response = await this.sendTextMessage(
          accessToken,
          phoneNumberId,
          community.metadata.phoneNumber,
          postData.content.text,
        );
      } else {
        throw new Error('Message content is required');
      }

      // Save the post
      const post = await CommunityPost.create({
        communityId: community._id,
        platform: ComPlatform.WHATSAPP,
        platformPostId: response.messages?.[0]?.id,
        content: postData.content,
        status: PostStatusCM.POSTED,
        postedAt: new Date(),
        createdBy: connection.userId,
        metadata: {
          whatsappMessageId: response.messages?.[0]?.id,
          recipient: community.metadata.phoneNumber,
        },
      });

      return {
        success: true,
        messageId: response.messages?.[0]?.id,
        postId: post._id,
      };
    } catch (error: any) {
      // Save failed post
      await CommunityPost.create({
        communityId: community._id,
        platform: ComPlatform.WHATSAPP,
        content: postData.content,
        status: PostStatusCM.FAILED,
        error: error.message,
        createdBy: connection.userId,
        metadata: {
          recipient: community.metadata.phoneNumber,
        },
      });

      this.handlePlatformError(error, ComPlatform.WHATSAPP);
    }
  }

  async updatePost(
    connection: ComConInterface,
    postId: string,
    postData: Partial<CommunityPostInterface>,
  ): Promise<any> {
    // WhatsApp messages cannot be edited after sending
    // We can only update the local record
    const post = await CommunityPost.findOneAndUpdate(
      {
        _id: postId,
        platform: ComPlatform.WHATSAPP,
        communityId: { $exists: true },
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
    // WhatsApp messages cannot be deleted via API
    // We can only delete the local record
    const post = await CommunityPost.findOneAndDelete({
      _id: postId,
      platform: ComPlatform.WHATSAPP,
    });

    if (!post) {
      throw new Error('Post not found');
    }

    return { success: true, message: 'Post record deleted locally' };
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
      platform: ComPlatform.WHATSAPP,
      content: postData.content,
      scheduledAt: scheduleTime,
      status: PostStatusCM.SCHEDULED,
      createdBy: connection.userId,
      metadata: {
        recipient: community.metadata.phoneNumber,
      },
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
    // WhatsApp doesn't have a member list API
    // We can return an empty array or implement webhook-based member tracking
    return [];
  }

  async removeMember(
    connection: ComConInterface,
    communityId: string,
    memberId: string,
  ): Promise<any> {
    // WhatsApp doesn't support removing members via API
    throw new Error('WhatsApp does not support removing members via API');
  }

  async sendMessage(
    connection: ComConInterface,
    to: string,
    message: any,
    options?: any,
  ): Promise<any> {
    const accessToken = this.getAccessToken(connection);
    const phoneNumberId = connection.metadata?.phoneNumberId;

    if (!phoneNumberId) {
      throw new Error('WhatsApp phone number ID not found');
    }

    try {
      let response;

      if (message.type === 'template') {
        // Send template message
        response = await this.sendTemplateMessage(accessToken, phoneNumberId, to, message);
      } else if (message.media) {
        // Send media message
        response = await this.sendMediaMessage(
          accessToken,
          phoneNumberId,
          to,
          message.media,
          message.text,
        );
      } else {
        // Send text message
        response = await this.sendTextMessage(accessToken, phoneNumberId, to, message.text);
      }

      return {
        success: true,
        messageId: response.messages?.[0]?.id,
        ...response,
      };
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.WHATSAPP);
    }
  }

  async refreshToken(connection: ComConInterface): Promise<ComConInterface> {
    return await comOauth.refreshToken(connection);
  }

  // WhatsApp-specific methods
  private async sendTextMessage(
    accessToken: string,
    phoneNumberId: string,
    to: string,
    text: string,
  ): Promise<any> {
    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: {
          preview_url: true,
          body: text,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  private async sendMediaMessage(
    accessToken: string,
    phoneNumberId: string,
    to: string,
    media: any,
    caption?: string,
  ): Promise<any> {
    // First upload media if it's a URL
    let mediaId;

    if (media.url.startsWith('http')) {
      const uploadResponse = await axios.post(
        `https://graph.facebook.com/v23.0/${phoneNumberId}/media`,
        {
          messaging_product: 'whatsapp',
          file: media.url,
          type: this.mapMediaType(media.type),
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      mediaId = uploadResponse.data.id;
    } else {
      mediaId = media.url; // Assume it's already a media ID
    }

    // Send media message
    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: this.mapMediaType(media.type),
        [this.mapMediaType(media.type)]: {
          id: mediaId,
          caption: caption,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  private async sendTemplateMessage(
    accessToken: string,
    phoneNumberId: string,
    to: string,
    template: any,
  ): Promise<any> {
    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'template',
        template: {
          name: template.name,
          language: {
            code: template.language || 'en_US',
          },
          components: template.components || [],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  private mapMediaType(type: string): string {
    switch (type) {
      case 'image':
        return 'image';
      case 'video':
        return 'video';
      case 'document':
        return 'document';
      case 'audio':
        return 'audio';
      default:
        return 'document';
    }
  }

  // Additional WhatsApp-specific methods
  async getBusinessProfile(connection: ComConInterface, phoneNumberId: string): Promise<any> {
    const accessToken = this.getAccessToken(connection);

    const response = await axios.get(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/whatsapp_business_profile`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return response.data;
  }

  async updateBusinessProfile(
    connection: ComConInterface,
    phoneNumberId: string,
    profileData: any,
  ): Promise<any> {
    const accessToken = this.getAccessToken(connection);

    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/whatsapp_business_profile`,
      profileData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  async verifyWebhook(token: string, mode: string, challenge: string): Promise<string> {
    // This should be called from your webhook endpoint
    // Verify the webhook subscription
    return challenge;
  }

  async handleIncomingMessage(payload: any): Promise<void> {
    // Handle incoming WhatsApp messages
    // You should implement your business logic here
    console.log('Incoming WhatsApp message:', payload);

    // Example: Save incoming message to database
    // Implement based on your requirements
  }
}
