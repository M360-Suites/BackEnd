"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const ComPlatformClient_1 = require("./ComPlatformClient");
const types_1 = require("../../../Types/types");
const CommunityModels_1 = require("../../../Models/CommunityModels");
const oauth_1 = __importDefault(require("../Auth/oauth"));
const axios_1 = __importDefault(require("axios"));
class WhatsAppService extends ComPlatformClient_1.ComPlatformClient {
    constructor() {
        super(types_1.ComPlatform.WHATSAPP);
    }
    async connectAccount(authCode, state) {
        if (!state) {
            throw new Error('State parameter is required for WhatsApp OAuth');
        }
        const connection = await oauth_1.default.handleCallback(authCode, state);
        return connection;
    }
    async disconnectAccount(connectionId) {
        const connection = await CommunityModels_1.CommunityConnection.findById(connectionId);
        if (!connection) {
            throw new Error('Connection not found');
        }
        await oauth_1.default.revokeConnection(connection);
    }
    async fetchCommunities(connection) {
        const accessToken = this.getAccessToken(connection);
        const businessAccountId = connection.metadata?.businessAccountId;
        if (!businessAccountId) {
            throw new Error('WhatsApp Business Account ID not found');
        }
        try {
            // WhatsApp doesn't have traditional communities, but we can treat phone numbers as communities
            const phoneNumbersResponse = await axios_1.default.get(`https://graph.facebook.com/v23.0/${businessAccountId}/phone_numbers`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const communities = [];
            for (const phoneNumber of phoneNumbersResponse.data.data) {
                const community = await CommunityModels_1.Community.findOneAndUpdate({
                    orgId: connection.orgId,
                    platform: types_1.ComPlatform.WHATSAPP,
                    platformCommunityId: phoneNumber.id,
                }, {
                    userId: connection.userId,
                    orgId: connection.orgId,
                    platform: types_1.ComPlatform.WHATSAPP,
                    platformCommunityId: phoneNumber.id,
                    name: phoneNumber.display_phone_number || phoneNumber.phone_number,
                    description: `WhatsApp Business Number: ${phoneNumber.display_phone_number}`,
                    type: types_1.CommunityType.COMMUNITY,
                    memberCount: 0, // WhatsApp doesn't provide member count
                    permissions: [types_1.CommunityPermission.ADMIN, types_1.CommunityPermission.WRITE],
                    metadata: {
                        phoneNumber: phoneNumber.phone_number,
                        displayPhoneNumber: phoneNumber.display_phone_number,
                        verifiedName: phoneNumber.verified_name,
                        qualityRating: phoneNumber.quality_rating,
                        codeVerificationStatus: phoneNumber.code_verification_status,
                    },
                    isActive: true,
                    lastSyncedAt: new Date(),
                }, { upsert: true, new: true });
                communities.push(community);
            }
            return communities;
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.WHATSAPP);
        }
    }
    async getCommunityDetails(connection, communityId) {
        const community = await CommunityModels_1.Community.findOne({
            _id: communityId,
            platform: types_1.ComPlatform.WHATSAPP,
            orgId: connection.orgId,
        });
        if (!community) {
            throw new Error('Community not found');
        }
        return community;
    }
    async createPost(connection, communityId, postData) {
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
                response = await this.sendMediaMessage(accessToken, phoneNumberId, community.metadata.phoneNumber, media, postData.content.text);
            }
            else if (postData.content.text) {
                // Send text message
                response = await this.sendTextMessage(accessToken, phoneNumberId, community.metadata.phoneNumber, postData.content.text);
            }
            else {
                throw new Error('Message content is required');
            }
            // Save the post
            const post = await CommunityModels_1.CommunityPost.create({
                communityId: community._id,
                platform: types_1.ComPlatform.WHATSAPP,
                platformPostId: response.messages?.[0]?.id,
                content: postData.content,
                status: types_1.PostStatusCM.POSTED,
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
        }
        catch (error) {
            // Save failed post
            await CommunityModels_1.CommunityPost.create({
                communityId: community._id,
                platform: types_1.ComPlatform.WHATSAPP,
                content: postData.content,
                status: types_1.PostStatusCM.FAILED,
                error: error.message,
                createdBy: connection.userId,
                metadata: {
                    recipient: community.metadata.phoneNumber,
                },
            });
            this.handlePlatformError(error, types_1.ComPlatform.WHATSAPP);
        }
    }
    async updatePost(connection, postId, postData) {
        // WhatsApp messages cannot be edited after sending
        // We can only update the local record
        const post = await CommunityModels_1.CommunityPost.findOneAndUpdate({
            _id: postId,
            platform: types_1.ComPlatform.WHATSAPP,
            communityId: { $exists: true },
        }, {
            content: postData.content,
            status: postData.status,
            error: postData.error,
        }, { new: true });
        if (!post) {
            throw new Error('Post not found');
        }
        return post;
    }
    async deletePost(connection, postId) {
        // WhatsApp messages cannot be deleted via API
        // We can only delete the local record
        const post = await CommunityModels_1.CommunityPost.findOneAndDelete({
            _id: postId,
            platform: types_1.ComPlatform.WHATSAPP,
        });
        if (!post) {
            throw new Error('Post not found');
        }
        return { success: true, message: 'Post record deleted locally' };
    }
    async schedulePost(connection, communityId, postData, scheduleTime) {
        const community = await this.getCommunityDetails(connection, communityId);
        // Create scheduled post
        const post = await CommunityModels_1.CommunityPost.create({
            communityId: community._id,
            platform: types_1.ComPlatform.WHATSAPP,
            content: postData.content,
            scheduledAt: scheduleTime,
            status: types_1.PostStatusCM.SCHEDULED,
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
    async fetchMembers(connection, communityId, limit = 100, offset = 0) {
        // WhatsApp doesn't have a member list API
        // We can return an empty array or implement webhook-based member tracking
        return [];
    }
    async removeMember(connection, communityId, memberId) {
        // WhatsApp doesn't support removing members via API
        throw new Error('WhatsApp does not support removing members via API');
    }
    async sendMessage(connection, to, message, options) {
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
            }
            else if (message.media) {
                // Send media message
                response = await this.sendMediaMessage(accessToken, phoneNumberId, to, message.media, message.text);
            }
            else {
                // Send text message
                response = await this.sendTextMessage(accessToken, phoneNumberId, to, message.text);
            }
            return {
                success: true,
                messageId: response.messages?.[0]?.id,
                ...response,
            };
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.WHATSAPP);
        }
    }
    async refreshToken(connection) {
        return await oauth_1.default.refreshToken(connection);
    }
    // WhatsApp-specific methods
    async sendTextMessage(accessToken, phoneNumberId, to, text) {
        const response = await axios_1.default.post(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: 'text',
            text: {
                preview_url: true,
                body: text,
            },
        }, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    }
    async sendMediaMessage(accessToken, phoneNumberId, to, media, caption) {
        // First upload media if it's a URL
        let mediaId;
        if (media.url.startsWith('http')) {
            const uploadResponse = await axios_1.default.post(`https://graph.facebook.com/v23.0/${phoneNumberId}/media`, {
                messaging_product: 'whatsapp',
                file: media.url,
                type: this.mapMediaType(media.type),
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            mediaId = uploadResponse.data.id;
        }
        else {
            mediaId = media.url; // Assume it's already a media ID
        }
        // Send media message
        const response = await axios_1.default.post(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: this.mapMediaType(media.type),
            [this.mapMediaType(media.type)]: {
                id: mediaId,
                caption: caption,
            },
        }, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    }
    async sendTemplateMessage(accessToken, phoneNumberId, to, template) {
        const response = await axios_1.default.post(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
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
        }, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    }
    mapMediaType(type) {
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
    async getBusinessProfile(connection, phoneNumberId) {
        const accessToken = this.getAccessToken(connection);
        const response = await axios_1.default.get(`https://graph.facebook.com/v23.0/${phoneNumberId}/whatsapp_business_profile`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response.data;
    }
    async updateBusinessProfile(connection, phoneNumberId, profileData) {
        const accessToken = this.getAccessToken(connection);
        const response = await axios_1.default.post(`https://graph.facebook.com/v23.0/${phoneNumberId}/whatsapp_business_profile`, profileData, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    }
    async verifyWebhook(token, mode, challenge) {
        // This should be called from your webhook endpoint
        // Verify the webhook subscription
        return challenge;
    }
    async handleIncomingMessage(payload) {
        // Handle incoming WhatsApp messages
        // You should implement your business logic here
        console.log('Incoming WhatsApp message:', payload);
        // Example: Save incoming message to database
        // Implement based on your requirements
    }
}
exports.WhatsAppService = WhatsAppService;
