"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookService = void 0;
const ComPlatformClient_1 = require("./ComPlatformClient");
const types_1 = require("../../../Types/types");
const CommunityModels_1 = require("../../../Models/CommunityModels");
const oauth_1 = __importDefault(require("../Auth/oauth"));
class FacebookService extends ComPlatformClient_1.ComPlatformClient {
    constructor() {
        super(types_1.ComPlatform.FACEBOOK);
    }
    async connectAccount(userId, authCode, state) {
        if (!state) {
            throw new Error('State parameter is required for Facebook OAuth');
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
                const community = await CommunityModels_1.Community.findOneAndUpdate({
                    orgId: connection.orgId,
                    platform: types_1.ComPlatform.FACEBOOK,
                    platformCommunityId: page.id,
                }, {
                    userId: connection.userId,
                    orgId: connection.orgId,
                    platform: types_1.ComPlatform.FACEBOOK,
                    platformCommunityId: page.id,
                    name: page.name,
                    avatar: page.picture?.data?.url,
                    type: types_1.CommunityType.PAGE,
                    permissions: page.perms || [types_1.CommunityPermission.WRITE],
                    metadata: {
                        accessToken: page.access_token,
                        category: page.category,
                        tasks: page.tasks,
                    },
                    isActive: true,
                    lastSyncedAt: new Date(),
                }, { upsert: true, new: true });
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
                    const community = await CommunityModels_1.Community.findOneAndUpdate({
                        orgId: connection.orgId,
                        platform: types_1.ComPlatform.FACEBOOK,
                        platformCommunityId: group.id,
                    }, {
                        userId: connection.userId,
                        orgId: connection.orgId,
                        platform: types_1.ComPlatform.FACEBOOK,
                        platformCommunityId: group.id,
                        name: group.name,
                        description: group.description,
                        avatar: group.cover?.source,
                        type: types_1.CommunityType.GROUP,
                        memberCount: group.member_count,
                        permissions: group.administrator
                            ? [types_1.CommunityPermission.ADMIN]
                            : [types_1.CommunityPermission.WRITE],
                        metadata: {
                            privacy: group.privacy,
                            administrator: group.administrator,
                        },
                        isActive: true,
                        lastSyncedAt: new Date(),
                    }, { upsert: true, new: true });
                    communities.push(community);
                }
            }
            catch (groupsError) {
                console.log('User may not have groups permission:', groupsError.message);
            }
            return communities;
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.FACEBOOK);
        }
    }
    async getCommunityDetails(connection, communityId) {
        const community = await CommunityModels_1.Community.findOne({
            _id: communityId,
            platform: types_1.ComPlatform.FACEBOOK,
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
        }
        catch (error) {
            console.error('Error fetching community details:', error);
            return community; // Return cached data
        }
    }
    async createPost(connection, communityId, postData) {
        const community = await this.getCommunityDetails(connection, communityId);
        const pageAccessToken = community.metadata?.accessToken;
        if (!pageAccessToken) {
            throw new Error('Page access token not found');
        }
        try {
            let endpoint;
            let params = {
                access_token: pageAccessToken,
                message: postData.content.text,
            };
            if (community.type === types_1.CommunityType.PAGE) {
                endpoint = `https://graph.facebook.com/v23.0/${community.platformCommunityId}/feed`;
            }
            else if (community.type === types_1.CommunityType.GROUP) {
                endpoint = `https://graph.facebook.com/v23.0/${community.platformCommunityId}/feed`;
                params.access_token = this.getAccessToken(connection);
            }
            else {
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
                    }
                    else if (media.type === 'video') {
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
            const post = await CommunityModels_1.CommunityPost.create({
                communityId: community._id,
                platform: types_1.ComPlatform.FACEBOOK,
                platformPostId: response.id || response.post_id,
                content: postData.content,
                status: types_1.PostStatusCM.POSTED,
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
        }
        catch (error) {
            // Save failed post
            await CommunityModels_1.CommunityPost.create({
                communityId: community._id,
                platform: types_1.ComPlatform.FACEBOOK,
                content: postData.content,
                status: types_1.PostStatusCM.FAILED,
                error: error.message,
                createdBy: connection.userId,
            });
            this.handlePlatformError(error, types_1.ComPlatform.FACEBOOK);
        }
    }
    async updatePost(connection, postId, postData) {
        const post = await CommunityModels_1.CommunityPost.findById(postId);
        if (!post) {
            throw new Error('Post not found');
        }
        // Facebook only allows updating certain fields like message
        if (postData.content?.text && post.platformPostId) {
            const community = await CommunityModels_1.Community.findById(post.communityId);
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
            }
            catch (error) {
                console.error('Error updating Facebook post:', error);
            }
        }
        // Update local post
        const updatedPost = await CommunityModels_1.CommunityPost.findByIdAndUpdate(postId, {
            content: postData.content,
            status: postData.status || post.status,
            error: postData.error,
        }, { new: true });
        return updatedPost;
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
        const accessToken = community?.metadata?.accessToken || this.getAccessToken(connection);
        try {
            await this.makeApiRequest({
                method: 'DELETE',
                url: `https://graph.facebook.com/v23.0/${post.platformPostId}`,
                params: { access_token: accessToken },
            });
            // Delete from local database
            await CommunityModels_1.CommunityPost.findByIdAndDelete(postId);
            return { success: true, message: 'Post deleted successfully' };
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.FACEBOOK);
        }
    }
    async schedulePost(connection, communityId, postData, scheduleTime) {
        const community = await this.getCommunityDetails(connection, communityId);
        // Create scheduled post
        const post = await CommunityModels_1.CommunityPost.create({
            communityId: community._id,
            platform: types_1.ComPlatform.FACEBOOK,
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
        const community = await this.getCommunityDetails(connection, communityId);
        const accessToken = community.metadata?.accessToken || this.getAccessToken(connection);
        try {
            let endpoint;
            if (community.type === types_1.CommunityType.PAGE) {
                endpoint = `https://graph.facebook.com/v23.0/${community.platformCommunityId}/likes`;
            }
            else if (community.type === types_1.CommunityType.GROUP) {
                endpoint = `https://graph.facebook.com/v23.0/${community.platformCommunityId}/members`;
            }
            else {
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
            return response.data.map((member) => ({
                memberId: member.id,
                name: member.name,
                role: member.administrator ? types_1.CommunityPermission.ADMIN : types_1.CommunityPermission.MEMBER,
                joinedAt: new Date(), // Facebook doesn't provide join date
            }));
        }
        catch (error) {
            console.error('Error fetching members:', error.message);
            return [];
        }
    }
    async removeMember(connection, communityId, memberId) {
        // Only possible for groups and only if admin
        const community = await this.getCommunityDetails(connection, communityId);
        if (community.type !== types_1.CommunityType.GROUP) {
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
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.FACEBOOK);
        }
    }
    async sendMessage(connection, to, message, options) {
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
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.FACEBOOK);
        }
    }
    async refreshToken(connection) {
        return await oauth_1.default.refreshToken(connection);
    }
    // Facebook-specific methods
    async getPageInsights(connection, pageId, metric, period = 'day') {
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
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.FACEBOOK);
        }
    }
}
exports.FacebookService = FacebookService;
