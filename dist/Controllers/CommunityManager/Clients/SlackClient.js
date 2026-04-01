"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackService = void 0;
const ComPlatformClient_1 = require("./ComPlatformClient");
const types_1 = require("../../../Types/types");
const CommunityModels_1 = require("../../../Models/CommunityModels");
const oauth_1 = __importDefault(require("../Auth/oauth"));
class SlackService extends ComPlatformClient_1.ComPlatformClient {
    constructor() {
        super(types_1.ComPlatform.SLACK);
    }
    async connectAccount(userId, authCode, state) {
        if (!state) {
            throw new Error("State parameter is required for Slack OAuth");
        }
        const connection = await oauth_1.default.handleCallback(authCode, state);
        return connection;
    }
    async disconnectAccount(connectionId) {
        const connection = await CommunityModels_1.CommunityConnection.findById(connectionId);
        if (!connection) {
            throw new Error("Connection not found");
        }
        await oauth_1.default.revokeConnection(connection);
    }
    async fetchCommunities(connection) {
        const accessToken = this.getAccessToken(connection);
        try {
            const communities = [];
            // Fetch Slack workspaces
            const workspaceResponse = await this.makeApiRequest({
                method: "GET",
                url: "https://slack.com/api/team.info",
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (workspaceResponse.team) {
                const workspace = workspaceResponse.team;
                const community = await CommunityModels_1.Community.findOneAndUpdate({
                    orgId: connection.orgId,
                    platform: types_1.ComPlatform.SLACK,
                    platformCommunityId: workspace.id,
                }, {
                    orgId: connection.orgId,
                    platform: types_1.ComPlatform.SLACK,
                    platformCommunityId: workspace.id,
                    name: workspace.name,
                    avatar: workspace.icon?.image_230,
                    type: types_1.CommunityType.WORKSPACE,
                    permissions: [types_1.CommunityPermission.WRITE],
                    metadata: {
                        domain: workspace.domain,
                        icon: workspace.icon,
                    },
                    isActive: true,
                    lastSyncedAt: new Date(),
                }, { upsert: true, new: true });
                communities.push(community);
            }
            // Fetch channels within the workspace
            const channelsResponse = await this.makeApiRequest({
                method: "GET",
                url: "https://slack.com/api/conversations.list",
                headers: { Authorization: `Bearer ${accessToken}` },
                params: {
                    types: "public_channel,private_channel",
                    limit: 1000,
                },
            });
            for (const channel of channelsResponse.channels || []) {
                const community = await CommunityModels_1.Community.findOneAndUpdate({
                    orgId: connection.orgId,
                    platform: types_1.ComPlatform.SLACK,
                    platformCommunityId: channel.id,
                }, {
                    orgId: connection.orgId,
                    platform: types_1.ComPlatform.SLACK,
                    platformCommunityId: channel.id,
                    name: `#${channel.name}`,
                    description: channel.purpose?.value,
                    type: types_1.CommunityType.CHANNEL,
                    memberCount: channel.num_members,
                    permissions: channel.is_member
                        ? [types_1.CommunityPermission.WRITE]
                        : [types_1.CommunityPermission.READ],
                    metadata: {
                        isPrivate: channel.is_private,
                        isArchived: channel.is_archived,
                        creator: channel.creator,
                        created: channel.created,
                    },
                    isActive: !channel.is_archived,
                    lastSyncedAt: new Date(),
                }, { upsert: true, new: true });
                communities.push(community);
            }
            return communities;
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.SLACK);
        }
    }
    async getCommunityDetails(connection, communityId) {
        const community = await CommunityModels_1.Community.findOne({
            _id: communityId,
            platform: types_1.ComPlatform.SLACK,
            orgId: connection.orgId,
        });
        if (!community) {
            throw new Error("Community not found");
        }
        return community;
    }
    async createPost(connection, communityId, postData) {
        const community = await this.getCommunityDetails(connection, communityId);
        const accessToken = this.getAccessToken(connection);
        try {
            const data = {
                channel: community.platformCommunityId,
                text: postData.content.text,
            };
            // Add blocks for rich formatting
            if (postData.content.link || postData.content.media?.length) {
                data.blocks = [];
                if (postData.content.text) {
                    data.blocks.push({
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: postData.content.text,
                        },
                    });
                }
                if (postData.content.link) {
                    data.blocks.push({
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `<${postData.content.link}|${postData.content.linkPreview?.title || "Link"}>`,
                        },
                    });
                }
            }
            const response = await this.makeApiRequest({
                method: "POST",
                url: "https://slack.com/api/chat.postMessage",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                data,
            });
            // Save the post
            const post = await CommunityModels_1.CommunityPost.create({
                communityId: community._id,
                platform: types_1.ComPlatform.SLACK,
                platformPostId: response.ts,
                content: postData.content,
                status: types_1.PostStatusCM.POSTED,
                postedAt: new Date(),
                createdBy: connection.orgId,
                metadata: {
                    channel: response.channel,
                    timestamp: response.ts,
                },
            });
            return {
                success: true,
                timestamp: response.ts,
                localPostId: post._id,
            };
        }
        catch (error) {
            // Save failed post
            await CommunityModels_1.CommunityPost.create({
                communityId: community._id,
                platform: types_1.ComPlatform.SLACK,
                content: postData.content,
                status: types_1.PostStatusCM.FAILED,
                error: error.message,
                createdBy: connection.orgId,
            });
            this.handlePlatformError(error, types_1.ComPlatform.SLACK);
        }
    }
    async updatePost(connection, postId, postData) {
        const post = await CommunityModels_1.CommunityPost.findById(postId);
        if (!post) {
            throw new Error("Post not found");
        }
        // Slack allows updating messages
        if (postData.content?.text &&
            post.platformPostId &&
            post.metadata?.channel) {
            const accessToken = this.getAccessToken(connection);
            try {
                const data = {
                    channel: post.metadata.channel,
                    ts: post.platformPostId,
                    text: postData.content.text,
                };
                await this.makeApiRequest({
                    method: "POST",
                    url: "https://slack.com/api/chat.update",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    data,
                });
            }
            catch (error) {
                console.error("Error updating Slack message:", error);
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
            throw new Error("Post not found");
        }
        if (!post.platformPostId || !post.metadata?.channel) {
            throw new Error("Platform post ID or channel not found");
        }
        const accessToken = this.getAccessToken(connection);
        try {
            await this.makeApiRequest({
                method: "POST",
                url: "https://slack.com/api/chat.delete",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                data: {
                    channel: post.metadata.channel,
                    ts: post.platformPostId,
                },
            });
            // Delete from local database
            await CommunityModels_1.CommunityPost.findByIdAndDelete(postId);
            return { success: true, message: "Post deleted successfully" };
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.SLACK);
        }
    }
    async schedulePost(connection, communityId, postData, scheduleTime) {
        const community = await this.getCommunityDetails(connection, communityId);
        // Create scheduled post
        const post = await CommunityModels_1.CommunityPost.create({
            communityId: community._id,
            platform: types_1.ComPlatform.SLACK,
            content: postData.content,
            scheduledAt: scheduleTime,
            status: types_1.PostStatusCM.SCHEDULED,
            createdBy: connection.orgId,
        });
        return {
            success: true,
            postId: post._id,
            scheduledAt: scheduleTime,
        };
    }
    async fetchMembers(connection, communityId, limit = 100, offset = 0) {
        const community = await this.getCommunityDetails(connection, communityId);
        const accessToken = this.getAccessToken(connection);
        // For channels, get members
        if (community.type === types_1.CommunityType.CHANNEL) {
            try {
                const response = await this.makeApiRequest({
                    method: "GET",
                    url: "https://slack.com/api/conversations.members",
                    headers: { Authorization: `Bearer ${accessToken}` },
                    params: {
                        channel: community.platformCommunityId,
                        limit,
                    },
                });
                // Need to fetch user details for each member
                const members = [];
                for (const userId of response.members || []) {
                    const userResponse = await this.makeApiRequest({
                        method: "GET",
                        url: "https://slack.com/api/users.info",
                        headers: { Authorization: `Bearer ${accessToken}` },
                        params: { user: userId },
                    });
                    if (userResponse.user) {
                        members.push({
                            memberId: userResponse.user.id,
                            username: userResponse.user.name,
                            name: userResponse.user.real_name,
                            role: types_1.CommunityPermission.MEMBER, // Slack doesn't provide channel-specific roles
                            joinedAt: new Date(userResponse.user.updated * 1000),
                        });
                    }
                }
                return members;
            }
            catch (error) {
                console.error("Error fetching Slack members:", error.message);
                return [];
            }
        }
        return [];
    }
    async removeMember(connection, communityId, memberId) {
        // Slack doesn't support removing members from channels via API
        throw new Error("Slack API does not support removing members from channels");
    }
    async sendMessage(connection, to, message, options) {
        const accessToken = this.getAccessToken(connection);
        try {
            const response = await this.makeApiRequest({
                method: "POST",
                url: "https://slack.com/api/chat.postMessage",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                data: {
                    channel: to,
                    text: message.text,
                },
            });
            return {
                success: true,
                timestamp: response.ts,
                channel: response.channel,
            };
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.SLACK);
        }
    }
    async refreshToken(connection) {
        return await oauth_1.default.refreshToken(connection);
    }
    // Slack-specific methods
    async getChannelInfo(connection, channelId) {
        const accessToken = this.getAccessToken(connection);
        try {
            const response = await this.makeApiRequest({
                method: "GET",
                url: "https://slack.com/api/conversations.info",
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { channel: channelId },
            });
            return response.channel;
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.SLACK);
        }
    }
}
exports.SlackService = SlackService;
