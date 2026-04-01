"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramService = void 0;
const ComPlatformClient_1 = require("./ComPlatformClient");
const types_1 = require("../../../Types/types");
const CommunityModels_1 = require("../../../Models/CommunityModels");
const oauth_1 = __importDefault(require("../Auth/oauth"));
class InstagramService extends ComPlatformClient_1.ComPlatformClient {
    constructor() {
        super(types_1.ComPlatform.INSTAGRAM);
    }
    async connectAccount(userId, authCode, state) {
        if (!state) {
            throw new Error('State parameter is required for Instagram OAuth');
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
        try {
            const communities = [];
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
                            fields: 'id,username,profile_picture_url,name,biography,followers_count,follows_count,media_count',
                        },
                    });
                    const community = await CommunityModels_1.Community.findOneAndUpdate({
                        userId: connection.userId,
                        platform: types_1.ComPlatform.INSTAGRAM,
                        platformCommunityId: igResponse.id,
                    }, {
                        userId: connection.userId,
                        platform: types_1.ComPlatform.INSTAGRAM,
                        platformCommunityId: igResponse.id,
                        name: igResponse.username,
                        description: igResponse.biography,
                        avatar: igResponse.profile_picture_url,
                        type: types_1.CommunityType.PAGE,
                        memberCount: igResponse.followers_count,
                        permissions: [types_1.CommunityPermission.WRITE, types_1.CommunityPermission.ADMIN],
                        metadata: {
                            pageId: page.id,
                            pageAccessToken: page.access_token,
                            username: igResponse.username,
                            name: igResponse.name,
                            mediaCount: igResponse.media_count,
                        },
                        isActive: true,
                        lastSyncedAt: new Date(),
                    }, { upsert: true, new: true });
                    communities.push(community);
                }
            }
            return communities;
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.INSTAGRAM);
        }
    }
    async getCommunityDetails(connection, communityId) {
        const community = await CommunityModels_1.Community.findOne({
            _id: communityId,
            platform: types_1.ComPlatform.INSTAGRAM,
            userId: connection.userId,
        });
        if (!community) {
            throw new Error('Community not found');
        }
        return community;
    }
    async createPost(connection, communityId, postData) {
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
            }
            else {
                // Instagram requires media, cannot post text-only
                throw new Error('Instagram requires media for posts');
            }
            // Save the post
            const post = await CommunityModels_1.CommunityPost.create({
                communityId: community._id,
                platform: types_1.ComPlatform.INSTAGRAM,
                platformPostId: response.id,
                content: postData.content,
                status: types_1.PostStatusCM.POSTED,
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
        }
        catch (error) {
            // Save failed post
            await CommunityModels_1.CommunityPost.create({
                communityId: community._id,
                platform: types_1.ComPlatform.INSTAGRAM,
                content: postData.content,
                status: types_1.PostStatusCM.FAILED,
                error: error.message,
                createdBy: connection.userId,
            });
            this.handlePlatformError(error, types_1.ComPlatform.INSTAGRAM);
        }
    }
    async updatePost(connection, postId, postData) {
        // Instagram doesn't support updating posts
        // We can only update the local record
        const post = await CommunityModels_1.CommunityPost.findOneAndUpdate({
            _id: postId,
            platform: types_1.ComPlatform.INSTAGRAM,
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
        const post = await CommunityModels_1.CommunityPost.findById(postId);
        if (!post) {
            throw new Error('Post not found');
        }
        if (!post.platformPostId) {
            throw new Error('Platform post ID not found');
        }
        const community = await CommunityModels_1.Community.findById(post.communityId);
        const pageAccessToken = community?.metadata?.pageAccessToken;
        try {
            await this.makeApiRequest({
                method: 'DELETE',
                url: `https://graph.facebook.com/v23.0/${post.platformPostId}`,
                params: { access_token: pageAccessToken },
            });
            // Delete from local database
            await CommunityModels_1.CommunityPost.findByIdAndDelete(postId);
            return { success: true, message: 'Post deleted successfully' };
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.INSTAGRAM);
        }
    }
    async schedulePost(connection, communityId, postData, scheduleTime) {
        const community = await this.getCommunityDetails(connection, communityId);
        // Create scheduled post
        const post = await CommunityModels_1.CommunityPost.create({
            communityId: community._id,
            platform: types_1.ComPlatform.INSTAGRAM,
            content: postData.content,
            scheduledAt: scheduleTime,
            status: types_1.PostStatusCM.SCHEDULED,
            createdBy: connection.userId,
        });
        return {
            success: true,
            postId: post._id,
            scheduledAt: scheduleTime,
        };
    }
    async fetchMembers(connection, communityId, limit = 100, offset = 0) {
        // Instagram doesn't provide follower list via API
        return [];
    }
    async removeMember(connection, communityId, memberId) {
        // Instagram doesn't support removing followers via API
        throw new Error('Instagram API does not support removing followers');
    }
    async sendMessage(connection, to, message, options) {
        // Instagram messaging is limited and requires specific permissions
        throw new Error('Instagram messaging API is limited and requires specific permissions');
    }
    async refreshToken(connection) {
        return await oauth_1.default.refreshToken(connection);
    }
    // Instagram-specific methods
    async getMediaInsights(connection, mediaId) {
        const community = await CommunityModels_1.Community.findOne({
            userId: connection.userId,
            platform: types_1.ComPlatform.INSTAGRAM,
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
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.INSTAGRAM);
        }
    }
}
exports.InstagramService = InstagramService;
