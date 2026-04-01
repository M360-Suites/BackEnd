"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordService = void 0;
const ComPlatformClient_1 = require("./ComPlatformClient");
const types_1 = require("../../../Types/types");
const CommunityModels_1 = require("../../../Models/CommunityModels");
const oauth_1 = __importDefault(require("../Auth/oauth"));
class DiscordService extends ComPlatformClient_1.ComPlatformClient {
    constructor() {
        super(types_1.ComPlatform.DISCORD);
        this.discordBotToken = process.env.DISCORD_BOT_TOKEN;
    }
    async connectAccount(userId, authCode, state) {
        if (!state) {
            throw new Error("State parameter is required for Discord OAuth");
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
            // Fetch Discord guilds (servers)
            const guildsResponse = await this.makeApiRequest({
                method: "GET",
                url: "https://discord.com/api/users/@me/guilds",
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            for (const guild of guildsResponse) {
                // Check if bot is in this guild
                const botInGuild = await this.checkBotInGuild(guild.id);
                if (!botInGuild)
                    continue;
                const community = await CommunityModels_1.Community.findOneAndUpdate({
                    userId: connection.userId,
                    platform: types_1.ComPlatform.DISCORD,
                    platformCommunityId: guild.id,
                }, {
                    userId: connection.userId,
                    platform: types_1.ComPlatform.DISCORD,
                    platformCommunityId: guild.id,
                    name: guild.name,
                    avatar: guild.icon
                        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
                        : undefined,
                    type: types_1.CommunityType.SERVER,
                    permissions: guild.permissions
                        ? this.mapDiscordPermissions(guild.permissions)
                        : [types_1.CommunityPermission.WRITE],
                    metadata: {
                        icon: guild.icon,
                        owner: guild.owner,
                        permissions: guild.permissions,
                    },
                    isActive: true,
                    lastSyncedAt: new Date(),
                }, { upsert: true, new: true });
                communities.push(community);
            }
            return communities;
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.DISCORD);
        }
    }
    async checkBotInGuild(guildId) {
        try {
            await this.makeApiRequest({
                method: "GET",
                url: `https://discord.com/api/guilds/${guildId}`,
                headers: { Authorization: `Bot ${this.discordBotToken}` },
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    mapDiscordPermissions(permissions) {
        const perms = [];
        // Administrator permission (0x8)
        if ((permissions & 0x8) === 0x8) {
            perms.push(types_1.CommunityPermission.ADMIN);
        }
        // Manage Messages permission (0x2000)
        if ((permissions & 0x2000) === 0x2000) {
            perms.push(types_1.CommunityPermission.MODERATOR);
        }
        // Send Messages permission (0x800)
        if ((permissions & 0x800) === 0x800) {
            perms.push(types_1.CommunityPermission.WRITE);
        }
        // Read Messages permission (0x400)
        if ((permissions & 0x400) === 0x400) {
            perms.push(types_1.CommunityPermission.READ);
        }
        return perms.length > 0 ? perms : [types_1.CommunityPermission.MEMBER];
    }
    async getCommunityDetails(connection, communityId) {
        const community = await CommunityModels_1.Community.findOne({
            _id: communityId,
            platform: types_1.ComPlatform.DISCORD,
            userId: connection.userId,
        });
        if (!community) {
            throw new Error("Community not found");
        }
        return community;
    }
    async createPost(connection, communityId, postData) {
        const community = await this.getCommunityDetails(connection, communityId);
        // Discord requires channel ID, not server ID
        const channelId = postData.metadata?.channelId;
        if (!channelId) {
            throw new Error("Channel ID is required for Discord posts");
        }
        try {
            const data = {
                content: postData.content.text,
            };
            // Handle embeds for links
            if (postData.content.link) {
                data.embeds = [
                    {
                        title: postData.content.linkPreview?.title || "Link",
                        description: postData.content.linkPreview?.description ||
                            postData.content.link,
                        url: postData.content.link,
                        image: postData.content.linkPreview?.image
                            ? { url: postData.content.linkPreview.image }
                            : undefined,
                    },
                ];
            }
            const response = await this.makeApiRequest({
                method: "POST",
                url: `https://discord.com/api/channels/${channelId}/messages`,
                headers: {
                    Authorization: `Bot ${this.discordBotToken}`,
                    "Content-Type": "application/json",
                },
                data,
            });
            // Save the post
            const post = await CommunityModels_1.CommunityPost.create({
                communityId: community._id,
                platform: types_1.ComPlatform.DISCORD,
                platformPostId: response.id,
                content: postData.content,
                status: types_1.PostStatusCM.POSTED,
                postedAt: new Date(),
                createdBy: connection.userId,
                metadata: {
                    channelId,
                    discordMessageId: response.id,
                },
            });
            return {
                success: true,
                messageId: response.id,
                localPostId: post._id,
            };
        }
        catch (error) {
            // Save failed post
            await CommunityModels_1.CommunityPost.create({
                communityId: community._id,
                platform: types_1.ComPlatform.DISCORD,
                content: postData.content,
                status: types_1.PostStatusCM.FAILED,
                error: error.message,
                createdBy: connection.userId,
                metadata: {
                    channelId,
                },
            });
            this.handlePlatformError(error, types_1.ComPlatform.DISCORD);
        }
    }
    async updatePost(connection, postId, postData) {
        const post = await CommunityModels_1.CommunityPost.findById(postId);
        if (!post) {
            throw new Error("Post not found");
        }
        // Discord allows editing messages
        if (postData.content?.text &&
            post.platformPostId &&
            post.metadata?.channelId) {
            try {
                const data = {
                    content: postData.content.text,
                };
                await this.makeApiRequest({
                    method: "PATCH",
                    url: `https://discord.com/api/channels/${post.metadata.channelId}/messages/${post.platformPostId}`,
                    headers: {
                        Authorization: `Bot ${this.discordBotToken}`,
                        "Content-Type": "application/json",
                    },
                    data,
                });
            }
            catch (error) {
                console.error("Error updating Discord message:", error);
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
        if (!post.platformPostId || !post.metadata?.channelId) {
            throw new Error("Platform post ID or channel ID not found");
        }
        try {
            await this.makeApiRequest({
                method: "DELETE",
                url: `https://discord.com/api/channels/${post.metadata.channelId}/messages/${post.platformPostId}`,
                headers: { Authorization: `Bot ${this.discordBotToken}` },
            });
            // Delete from local database
            await CommunityModels_1.CommunityPost.findByIdAndDelete(postId);
            return { success: true, message: "Post deleted successfully" };
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.DISCORD);
        }
    }
    async schedulePost(connection, communityId, postData, scheduleTime) {
        const community = await this.getCommunityDetails(connection, communityId);
        // Create scheduled post
        const post = await CommunityModels_1.CommunityPost.create({
            communityId: community._id,
            platform: types_1.ComPlatform.DISCORD,
            content: postData.content,
            scheduledAt: scheduleTime,
            status: types_1.PostStatusCM.SCHEDULED,
            createdBy: connection.userId,
            metadata: {
                channelId: postData.metadata?.channelId,
            },
        });
        return {
            success: true,
            postId: post._id,
            scheduledAt: scheduleTime,
        };
    }
    async fetchMembers(connection, communityId, limit = 100, offset = 0) {
        const community = await this.getCommunityDetails(connection, communityId);
        try {
            const response = await this.makeApiRequest({
                method: "GET",
                url: `https://discord.com/api/guilds/${community.platformCommunityId}/members`,
                headers: { Authorization: `Bot ${this.discordBotToken}` },
                params: {
                    limit,
                    offset,
                },
            });
            return response.map((member) => ({
                memberId: member.user.id,
                username: member.user.username,
                name: member.user.global_name || member.user.username,
                role: this.mapDiscordRole(member.roles),
                joinedAt: new Date(member.joined_at),
            }));
        }
        catch (error) {
            console.error("Error fetching Discord members:", error.message);
            return [];
        }
    }
    mapDiscordRole(roles) {
        // This would require checking role permissions
        // Simplified implementation
        return types_1.CommunityPermission.MEMBER;
    }
    async removeMember(connection, communityId, memberId) {
        const community = await this.getCommunityDetails(connection, communityId);
        try {
            await this.makeApiRequest({
                method: "DELETE",
                url: `https://discord.com/api/guilds/${community.platformCommunityId}/members/${memberId}`,
                headers: { Authorization: `Bot ${this.discordBotToken}` },
            });
            return { success: true, message: "Member removed successfully" };
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.DISCORD);
        }
    }
    async sendMessage(connection, to, message, options) {
        try {
            const data = {
                content: message.text,
            };
            const response = await this.makeApiRequest({
                method: "POST",
                url: `https://discord.com/api/channels/${to}/messages`,
                headers: {
                    Authorization: `Bot ${this.discordBotToken}`,
                    "Content-Type": "application/json",
                },
                data,
            });
            return {
                success: true,
                messageId: response.id,
            };
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.DISCORD);
        }
    }
    async refreshToken(connection) {
        // Discord tokens expire, need to refresh
        return await oauth_1.default.refreshToken(connection);
    }
    // Discord-specific methods
    async getChannels(connection, guildId) {
        try {
            const response = await this.makeApiRequest({
                method: "GET",
                url: `https://discord.com/api/guilds/${guildId}/channels`,
                headers: { Authorization: `Bot ${this.discordBotToken}` },
            });
            return response;
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.DISCORD);
        }
    }
}
exports.DiscordService = DiscordService;
