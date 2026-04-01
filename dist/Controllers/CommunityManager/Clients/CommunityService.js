"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityService = void 0;
const types_1 = require("../../../Types/types");
const oauth_1 = __importDefault(require("../Auth/oauth"));
const CommunityModels_1 = require("../../../Models/CommunityModels");
const Clients_1 = require("../Clients");
class CommunityService {
    constructor() {
        this.platformServices = new Map();
        this.initializePlatformServices();
    }
    initializePlatformServices() {
        this.platformServices.set(types_1.ComPlatform.WHATSAPP, new Clients_1.WhatsAppService());
        this.platformServices.set(types_1.ComPlatform.FACEBOOK, new Clients_1.FacebookService());
        this.platformServices.set(types_1.ComPlatform.LINKEDIN, new Clients_1.LinkedInService());
        this.platformServices.set(types_1.ComPlatform.TELEGRAM, new Clients_1.TelegramService());
        this.platformServices.set(types_1.ComPlatform.DISCORD, new Clients_1.DiscordService());
        this.platformServices.set(types_1.ComPlatform.SLACK, new Clients_1.SlackService());
        this.platformServices.set(types_1.ComPlatform.INSTAGRAM, new Clients_1.InstagramService());
        this.platformServices.set(types_1.ComPlatform.TWITTER, new Clients_1.TwitterService());
        // Add other services as needed
    }
    getPlatformService(platform) {
        const service = this.platformServices.get(platform);
        if (!service) {
            throw new Error(`Platform ${platform} is not supported`);
        }
        return service;
    }
    // Platform Connection Methods
    async initiatePlatformConnection(platform, orgId, userId) {
        const { url: authUrl } = await oauth_1.default.generateAuthUrl(platform, orgId);
        return { authUrl };
    }
    async getPlatformConnections(orgId) {
        const connections = await CommunityModels_1.CommunityConnection.find({ orgId });
        return connections.map((conn) => ({
            id: conn._id,
            platform: conn.platform,
            accountName: conn.accountName,
            connectedAt: conn.createdAt,
            isExpired: conn.expiresAt && new Date() > conn.expiresAt,
        }));
    }
    async disconnectPlatform(connectionId, orgId) {
        const connection = await CommunityModels_1.CommunityConnection.findOne({
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
    async getCommunities(orgId, platform) {
        const query = { orgId, isActive: true };
        if (platform) {
            query.platform = platform;
        }
        return await CommunityModels_1.Community.find(query).sort({ updatedAt: -1 });
    }
    async syncCommunities(orgId, platform) {
        const connection = await CommunityModels_1.CommunityConnection.findOne({ orgId, platform });
        if (!connection) {
            throw new Error(`No connection found for ${platform}`);
        }
        const service = this.getPlatformService(platform);
        return await service.fetchCommunities(connection);
    }
    async getCommunityDetails(communityId, orgId) {
        const community = await CommunityModels_1.Community.findOne({ _id: communityId, orgId });
        if (!community) {
            throw new Error('Community not found');
        }
        const connection = await CommunityModels_1.CommunityConnection.findOne({
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
    async createPost(communityId, content, scheduledAt, orgId, userId) {
        const community = await CommunityModels_1.Community.findOne({ _id: communityId, orgId });
        if (!community) {
            throw new Error('Community not found');
        }
        const connection = await CommunityModels_1.CommunityConnection.findOne({
            orgId,
            platform: community.platform,
        });
        if (!connection) {
            throw new Error('Platform connection not found');
        }
        const service = this.getPlatformService(community.platform);
        const postData = {
            content,
            createdBy: userId,
        };
        if (scheduledAt) {
            return await service.schedulePost(connection, communityId, postData, scheduledAt);
        }
        else {
            return await service.createPost(connection, communityId, postData);
        }
    }
    async getPosts(orgId, communityId, status, page = 1, limit = 20) {
        const query = {};
        if (communityId) {
            const community = await CommunityModels_1.Community.findOne({ _id: communityId, orgId });
            if (!community) {
                throw new Error('Community not found');
            }
            query.communityId = communityId;
        }
        else {
            // Get all communities for this org
            const communities = await CommunityModels_1.Community.find({ orgId }).select('_id');
            query.communityId = { $in: communities.map((c) => c._id) };
        }
        if (status) {
            query.status = status;
        }
        const skip = (page - 1) * limit;
        const [posts, total] = await Promise.all([
            CommunityModels_1.CommunityPost.find(query)
                .populate('communityId', 'name platform')
                .sort({ scheduledAt: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit),
            CommunityModels_1.CommunityPost.countDocuments(query),
        ]);
        return {
            posts,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async updatePost(postId, updateData, orgId) {
        const post = await CommunityModels_1.CommunityPost.findById(postId).populate('communityId');
        if (!post) {
            throw new Error('Post not found');
        }
        if (post.communityId.orgId.toString() !== orgId) {
            throw new Error('Unauthorized');
        }
        const connection = await CommunityModels_1.CommunityConnection.findOne({
            orgId,
            platform: post.communityId.platform,
        });
        if (!connection) {
            throw new Error('Platform connection not found');
        }
        const service = this.getPlatformService(post.communityId.platform);
        // If post is scheduled and we're changing the schedule time
        if (updateData.scheduledAt && post.status === 'scheduled') {
            // Cancel the old scheduled post and create a new one
            await service.deletePost(connection, postId);
            const community = await CommunityModels_1.Community.findById(post.communityId._id);
            if (!community) {
                throw new Error('Community not found');
            }
            return await service.schedulePost(connection, community._id.toString(), { ...post.toObject(), ...updateData }, updateData.scheduledAt);
        }
        return await service.updatePost(connection, postId, updateData);
    }
    async deletePost(postId, orgId) {
        const post = await CommunityModels_1.CommunityPost.findById(postId).populate('communityId');
        if (!post) {
            throw new Error('Post not found');
        }
        if (post.communityId.orgId.toString() !== orgId) {
            throw new Error('Unauthorized');
        }
        const connection = await CommunityModels_1.CommunityConnection.findOne({
            orgId,
            platform: post.communityId.platform,
        });
        if (!connection) {
            throw new Error('Platform connection not found');
        }
        const service = this.getPlatformService(post.communityId.platform);
        await service.deletePost(connection, postId);
    }
    // Member Methods
    async getCommunityMembers(communityId, orgId, page = 1, limit = 50) {
        const community = await CommunityModels_1.Community.findOne({ _id: communityId, orgId });
        if (!community) {
            throw new Error('Community not found');
        }
        const connection = await CommunityModels_1.CommunityConnection.findOne({
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
    async sendWhatsAppMessage(orgId, phoneNumber, message) {
        const connection = await CommunityModels_1.CommunityConnection.findOne({
            orgId,
            platform: types_1.ComPlatform.WHATSAPP,
        });
        if (!connection) {
            throw new Error('WhatsApp connection not found');
        }
        const service = this.getPlatformService(types_1.ComPlatform.WHATSAPP);
        return await service.sendMessage(connection, phoneNumber, message);
    }
    async getWhatsAppBusinessProfile(connectionId, orgId) {
        const connection = await CommunityModels_1.CommunityConnection.findOne({
            _id: connectionId,
            orgId,
            platform: types_1.ComPlatform.WHATSAPP,
        });
        if (!connection) {
            throw new Error('WhatsApp connection not found');
        }
        const phoneNumberId = connection.metadata?.phoneNumberId;
        if (!phoneNumberId) {
            throw new Error('Phone number ID not found');
        }
        const service = this.getPlatformService(types_1.ComPlatform.WHATSAPP);
        return await service.getBusinessProfile(connection, phoneNumberId);
    }
    async handleWhatsAppWebhook(payload) {
        // Handle incoming WhatsApp webhook
        // You can implement your business logic here
        console.log('WhatsApp webhook payload:', payload);
        // Example: Process message status updates
        if (payload.entry?.[0]?.changes?.[0]?.value?.statuses) {
            const statuses = payload.entry[0].changes[0].value.statuses;
            for (const status of statuses) {
                // Update message status in database
                await CommunityModels_1.CommunityPost.findOneAndUpdate({ 'metadata.whatsappMessageId': status.id }, {
                    status: status.status === 'sent' ? 'posted' : 'failed',
                    error: status.errors?.[0]?.title,
                    updatedAt: new Date(),
                });
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
    async refreshPlatformToken(connectionId, orgId) {
        const connection = await CommunityModels_1.CommunityConnection.findOne({
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
    async processScheduledPosts() {
        const now = new Date();
        const scheduledPosts = await CommunityModels_1.CommunityPost.find({
            status: 'scheduled',
            scheduledAt: { $lte: now },
        }).populate('communityId');
        for (const post of scheduledPosts) {
            try {
                const community = post.communityId;
                const connection = await CommunityModels_1.CommunityConnection.findOne({
                    orgId: community.orgId,
                    platform: community.platform,
                });
                if (!connection) {
                    throw new Error('Platform connection not found');
                }
                const service = this.getPlatformService(community.platform);
                await service.createPost(connection, community._id.toString(), post);
                // Update post status
                post.status = types_1.PostStatusCM.POSTED;
                post.postedAt = new Date();
                await post.save();
            }
            catch (error) {
                console.error(`Error processing scheduled post ${post._id}:`, error);
                post.status = types_1.PostStatusCM.FAILED;
                post.error = error.message;
                await post.save();
            }
        }
    }
}
exports.CommunityService = CommunityService;
