import {
  ComPlatform,
  CommunityInterface,
  CommunityPostInterface,
  CommunityMember,
  ComConInterface,
  CommunityMember as CommunityMemberModel,
  ICommunityPlatformService,
  PostStatusCM,
} from '../../../Types/types';
import comOauth from '../Auth/oauth';
import { Community, CommunityConnection, CommunityPost } from '../../../Models/CommunityModels';
import {
  FacebookService,
  WhatsAppService,
  LinkedInService,
  TelegramService,
  DiscordService,
  SlackService,
  InstagramService,
  TwitterService,
} from '../Clients';

export class CommunityService {
  private platformServices: Map<ComPlatform, ICommunityPlatformService>;

  constructor() {
    this.platformServices = new Map();
    this.initializePlatformServices();
  }

  private initializePlatformServices(): void {
    this.platformServices.set(ComPlatform.WHATSAPP, new WhatsAppService());
    this.platformServices.set(ComPlatform.FACEBOOK, new FacebookService());
    this.platformServices.set(ComPlatform.LINKEDIN, new LinkedInService());
    this.platformServices.set(ComPlatform.TELEGRAM, new TelegramService());
    this.platformServices.set(ComPlatform.DISCORD, new DiscordService());
    this.platformServices.set(ComPlatform.SLACK, new SlackService());
    this.platformServices.set(ComPlatform.INSTAGRAM, new InstagramService());
    this.platformServices.set(ComPlatform.TWITTER, new TwitterService());
    // Add other services as needed
  }

  private getPlatformService(platform: ComPlatform): ICommunityPlatformService {
    const service = this.platformServices.get(platform);
    if (!service) {
      throw new Error(`Platform ${platform} is not supported`);
    }
    return service;
  }

  // Platform Connection Methods
  async initiatePlatformConnection(
    platform: ComPlatform,
    orgId: string,
    userId: string,
  ): Promise<{ authUrl: string }> {
    const { url: authUrl } = await comOauth.generateAuthUrl(platform, orgId);
    return { authUrl };
  }

  async getPlatformConnections(orgId: string): Promise<any[]> {
    const connections = await CommunityConnection.find({ orgId });
    return connections.map((conn) => ({
      id: conn._id,
      platform: conn.platform,
      accountName: conn.accountName,
      connectedAt: conn.createdAt,
      isExpired: conn.expiresAt && new Date() > conn.expiresAt,
    }));
  }

  async disconnectPlatform(connectionId: string, orgId: string): Promise<void> {
    const connection = await CommunityConnection.findOne({
      _id: connectionId,
      orgId,
    });
    if (!connection) {
      throw new Error('Connection not found');
    }

    const service = this.getPlatformService(connection.platform);
    await service.disconnectAccount(connectionId);
  }

  // Community Methods
  async getCommunities(orgId: string, platform?: ComPlatform): Promise<CommunityInterface[]> {
    const query: any = { orgId, isActive: true };
    if (platform) {
      query.platform = platform;
    }

    return await Community.find(query).sort({ updatedAt: -1 });
  }

  async syncCommunities(orgId: string, platform: ComPlatform): Promise<CommunityInterface[]> {
    const connection = await CommunityConnection.findOne({ orgId, platform });
    if (!connection) {
      throw new Error(`No connection found for ${platform}`);
    }

    const service = this.getPlatformService(platform);
    return await service.fetchCommunities(connection);
  }

  async getCommunityDetails(communityId: string, orgId: string): Promise<CommunityInterface> {
    const community = await Community.findOne({ _id: communityId, orgId });
    if (!community) {
      throw new Error('Community not found');
    }

    const connection = await CommunityConnection.findOne({
      orgId,
      platform: community.platform,
    });
    if (!connection) {
      throw new Error('Platform connection not found');
    }

    const service = this.getPlatformService(community.platform);
    return await service.getCommunityDetails(connection, communityId);
  }

  // Post Methods
  async createPost(
    communityId: string,
    content: any,
    scheduledAt: Date | undefined,
    orgId: string,
    userId: string,
  ): Promise<any> {
    const community = await Community.findOne({ _id: communityId, orgId });
    if (!community) {
      throw new Error('Community not found');
    }

    const connection = await CommunityConnection.findOne({
      orgId,
      platform: community.platform,
    });
    if (!connection) {
      throw new Error('Platform connection not found');
    }

    const service = this.getPlatformService(community.platform);

    const postData: any = {
      content,
      createdBy: userId,
    };

    if (scheduledAt) {
      return await service.schedulePost(connection, communityId, postData, scheduledAt);
    } else {
      return await service.createPost(connection, communityId, postData);
    }
  }

  async getPosts(
    orgId: string,
    communityId?: string,
    status?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    posts: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: any = {};

    if (communityId) {
      const community = await Community.findOne({ _id: communityId, orgId });
      if (!community) {
        throw new Error('Community not found');
      }
      query.communityId = communityId;
    } else {
      // Get all communities for this org
      const communities = await Community.find({ orgId }).select('_id');
      query.communityId = { $in: communities.map((c) => c._id) };
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      CommunityPost.find(query)
        .populate('communityId', 'name platform')
        .sort({ scheduledAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CommunityPost.countDocuments(query),
    ]);

    return {
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updatePost(postId: string, updateData: any, orgId: string): Promise<any> {
    const post = await CommunityPost.findById(postId).populate('communityId');
    if (!post) {
      throw new Error('Post not found');
    }

    if ((post.communityId as any).orgId.toString() !== orgId) {
      throw new Error('Unauthorized');
    }

    const connection = await CommunityConnection.findOne({
      orgId,
      platform: (post.communityId as any).platform,
    });

    if (!connection) {
      throw new Error('Platform connection not found');
    }

    const service = this.getPlatformService((post.communityId as any).platform);

    // If post is scheduled and we're changing the schedule time
    if (updateData.scheduledAt && post.status === 'scheduled') {
      // Cancel the old scheduled post and create a new one
      await service.deletePost(connection, postId);

      const community = await Community.findById((post.communityId as any)._id);
      if (!community) {
        throw new Error('Community not found');
      }

      return await service.schedulePost(
        connection,
        community._id.toString(),
        { ...post.toObject(), ...updateData },
        updateData.scheduledAt,
      );
    }

    return await service.updatePost(connection, postId, updateData);
  }

  async deletePost(postId: string, orgId: string): Promise<void> {
    const post = await CommunityPost.findById(postId).populate('communityId');
    if (!post) {
      throw new Error('Post not found');
    }

    if ((post.communityId as any).orgId.toString() !== orgId) {
      throw new Error('Unauthorized');
    }

    const connection = await CommunityConnection.findOne({
      orgId,
      platform: (post.communityId as any).platform,
    });

    if (!connection) {
      throw new Error('Platform connection not found');
    }

    const service = this.getPlatformService((post.communityId as any).platform);
    await service.deletePost(connection, postId);
  }

  // Member Methods
  async getCommunityMembers(
    communityId: string,
    orgId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    members: CommunityMember[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const community = await Community.findOne({ _id: communityId, orgId });
    if (!community) {
      throw new Error('Community not found');
    }

    const connection = await CommunityConnection.findOne({
      orgId,
      platform: community.platform,
    });
    if (!connection) {
      throw new Error('Platform connection not found');
    }

    const service = this.getPlatformService(community.platform);
    const members = await service.fetchMembers(connection, communityId, limit, (page - 1) * limit);

    // You might want to save members to your database here
    return {
      members,
      total: members.length,
      page,
      totalPages: Math.ceil(members.length / limit),
    };
  }

  // WhatsApp-specific Methods
  async sendWhatsAppMessage(orgId: string, phoneNumber: string, message: any): Promise<any> {
    const connection = await CommunityConnection.findOne({
      orgId,
      platform: ComPlatform.WHATSAPP,
    });
    if (!connection) {
      throw new Error('WhatsApp connection not found');
    }

    const service = this.getPlatformService(ComPlatform.WHATSAPP) as WhatsAppService;
    return await service.sendMessage(connection, phoneNumber, message);
  }

  async getWhatsAppBusinessProfile(connectionId: string, orgId: string): Promise<any> {
    const connection = await CommunityConnection.findOne({
      _id: connectionId,
      orgId,
      platform: ComPlatform.WHATSAPP,
    });
    if (!connection) {
      throw new Error('WhatsApp connection not found');
    }

    const phoneNumberId = connection.metadata?.phoneNumberId;
    if (!phoneNumberId) {
      throw new Error('Phone number ID not found');
    }

    const service = this.getPlatformService(ComPlatform.WHATSAPP) as WhatsAppService;
    return await service.getBusinessProfile(connection, phoneNumberId);
  }

  async handleWhatsAppWebhook(payload: any): Promise<void> {
    // Handle incoming WhatsApp webhook
    // You can implement your business logic here

    console.log('WhatsApp webhook payload:', payload);

    // Example: Process message status updates
    if (payload.entry?.[0]?.changes?.[0]?.value?.statuses) {
      const statuses = payload.entry[0].changes[0].value.statuses;
      for (const status of statuses) {
        // Update message status in database
        await CommunityPost.findOneAndUpdate(
          { 'metadata.whatsappMessageId': status.id },
          {
            status: status.status === 'sent' ? 'posted' : 'failed',
            error: status.errors?.[0]?.title,
            updatedAt: new Date(),
          },
        );
      }
    }

    // Example: Process incoming messages
    if (payload.entry?.[0]?.changes?.[0]?.value?.messages) {
      const messages = payload.entry[0].changes[0].value.messages;
      for (const message of messages) {
        // Handle incoming message
        console.log('Incoming message:', message);
        // Implement your message handling logic here
      }
    }
  }

  // Token Refresh
  async refreshPlatformToken(connectionId: string, orgId: string): Promise<any> {
    const connection = await CommunityConnection.findOne({
      _id: connectionId,
      orgId,
    });
    if (!connection) {
      throw new Error('Connection not found');
    }

    const service = this.getPlatformService(connection.platform);
    return await service.refreshToken(connection);
  }

  // Schedule Post Processing (to be run by a cron job)
  async processScheduledPosts(): Promise<void> {
    const now = new Date();
    const scheduledPosts = await CommunityPost.find({
      status: 'scheduled',
      scheduledAt: { $lte: now },
    }).populate('communityId');

    for (const post of scheduledPosts) {
      try {
        const community = post.communityId as any;
        const connection = await CommunityConnection.findOne({
          orgId: community.orgId,
          platform: community.platform,
        });

        if (!connection) {
          throw new Error('Platform connection not found');
        }

        const service = this.getPlatformService(community.platform);
        await service.createPost(connection, community._id.toString(), post);

        // Update post status
        post.status = PostStatusCM.POSTED;
        post.postedAt = new Date();
        await post.save();
      } catch (error: any) {
        console.error(`Error processing scheduled post ${post._id}:`, error);
        post.status = PostStatusCM.FAILED;
        post.error = error.message;
        await post.save();
      }
    }
  }
}
