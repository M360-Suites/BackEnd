"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramService = void 0;
const ComPlatformClient_1 = require("./ComPlatformClient");
const types_1 = require("../../../Types/types");
const CommunityModels_1 = require("../../../Models/CommunityModels");
const encryption_1 = require("../../../Services/encryption");
class TelegramService extends ComPlatformClient_1.ComPlatformClient {
    constructor() {
        super(types_1.ComPlatform.TELEGRAM);
    }
    async connectAccount(userId, authCode, state) {
        // Telegram uses bot tokens, not OAuth 2.0
        // The authCode is actually the bot token
        const botToken = authCode;
        // Verify the bot token
        const botInfo = await this.makeApiRequest({
            method: "GET",
            url: `https://api.telegram.org/bot${botToken}/getMe`,
        });
        if (!botInfo.ok) {
            throw new Error("Invalid bot token");
        }
        // Store connection
        const connection = await CommunityModels_1.CommunityConnection.findOneAndUpdate({ userId, platform: types_1.ComPlatform.TELEGRAM }, {
            userId,
            platform: types_1.ComPlatform.TELEGRAM,
            accessToken: (0, encryption_1.encrypt)(botToken),
            accountId: botInfo.result.id.toString(),
            accountName: botInfo.result.username || botInfo.result.first_name,
            scopes: ["bot"],
            metadata: {
                botToken,
                botInfo: botInfo.result,
            },
        }, { upsert: true, new: true });
        return connection;
    }
    async disconnectAccount(connectionId) {
        await CommunityModels_1.CommunityConnection.findByIdAndDelete(connectionId);
    }
    async fetchCommunities(connection) {
        const botToken = this.getAccessToken(connection);
        try {
            const communities = [];
            // Get updates to find groups/channels the bot is in
            const updatesResponse = await this.makeApiRequest({
                method: "GET",
                url: `https://api.telegram.org/bot${botToken}/getUpdates`,
                params: {
                    limit: 100,
                    timeout: 0,
                },
            });
            const processedChats = new Set();
            for (const update of updatesResponse.result || []) {
                const chat = update.message?.chat ||
                    update.channel_post?.chat ||
                    update.my_chat_member?.chat;
                if (chat && !processedChats.has(chat.id)) {
                    processedChats.add(chat.id);
                    let communityType = types_1.CommunityType.GROUP;
                    if (chat.type === "channel")
                        communityType = types_1.CommunityType.CHANNEL;
                    if (chat.type === "supergroup")
                        communityType = types_1.CommunityType.COMMUNITY;
                    const community = await CommunityModels_1.Community.findOneAndUpdate({
                        userId: connection.userId,
                        platform: types_1.ComPlatform.TELEGRAM,
                        platformCommunityId: chat.id.toString(),
                    }, {
                        userId: connection.userId,
                        platform: types_1.ComPlatform.TELEGRAM,
                        platformCommunityId: chat.id.toString(),
                        name: chat.title || chat.username || `Telegram ${chat.type}`,
                        type: communityType,
                        memberCount: chat.members_count || 0,
                        permissions: [
                            types_1.CommunityPermission.WRITE,
                            types_1.CommunityPermission.ADMIN,
                        ],
                        metadata: {
                            chatType: chat.type,
                            username: chat.username,
                            inviteLink: chat.invite_link,
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
            this.handlePlatformError(error, types_1.ComPlatform.TELEGRAM);
        }
    }
    async getCommunityDetails(connection, communityId) {
        const community = await CommunityModels_1.Community.findOne({
            _id: communityId,
            platform: types_1.ComPlatform.TELEGRAM,
            userId: connection.userId,
        });
        if (!community) {
            throw new Error("Community not found");
        }
        return community;
    }
    async createPost(connection, communityId, postData) {
        const community = await this.getCommunityDetails(connection, communityId);
        const botToken = this.getAccessToken(connection);
        try {
            let endpoint = '';
            let params = {
                chat_id: community.platformCommunityId,
            };
            if (postData.content.text) {
                params.text = postData.content.text;
                params.parse_mode = "HTML";
                endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
            }
            if (postData.content.media && postData.content.media.length > 0) {
                const media = postData.content.media[0];
                switch (media.type) {
                    case "image":
                        endpoint = `https://api.telegram.org/bot${botToken}/sendPhoto`;
                        params.photo = media.url;
                        params.caption = postData.content.text;
                        break;
                    case "video":
                        endpoint = `https://api.telegram.org/bot${botToken}/sendVideo`;
                        params.video = media.url;
                        params.caption = postData.content.text;
                        break;
                    case "document":
                        endpoint = `https://api.telegram.org/bot${botToken}/sendDocument`;
                        params.document = media.url;
                        params.caption = postData.content.text;
                        break;
                    default:
                        endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
                        params.text = postData.content.text || `Media: ${media.url}`;
                }
            }
            const response = await this.makeApiRequest({
                method: "POST",
                url: endpoint,
                params,
            });
            // Save the post
            const post = await CommunityModels_1.CommunityPost.create({
                communityId: community._id,
                platform: types_1.ComPlatform.TELEGRAM,
                platformPostId: response.result.message_id.toString(),
                content: postData.content,
                status: types_1.PostStatusCM.POSTED,
                postedAt: new Date(),
                createdBy: connection.userId,
                metadata: {
                    chatId: response.result.chat.id,
                    messageId: response.result.message_id,
                },
            });
            return {
                success: true,
                messageId: response.result.message_id,
                localPostId: post._id,
            };
        }
        catch (error) {
            // Save failed post
            await CommunityModels_1.CommunityPost.create({
                communityId: community._id,
                platform: types_1.ComPlatform.TELEGRAM,
                content: postData.content,
                status: types_1.PostStatusCM.FAILED,
                error: error.message,
                createdBy: connection.userId,
            });
            this.handlePlatformError(error, types_1.ComPlatform.TELEGRAM);
        }
    }
    async updatePost(connection, postId, postData) {
        const post = await CommunityModels_1.CommunityPost.findById(postId);
        if (!post) {
            throw new Error("Post not found");
        }
        // Telegram allows editing messages
        if (postData.content?.text && post.platformPostId) {
            const community = await CommunityModels_1.Community.findById(post.communityId);
            const botToken = this.getAccessToken(connection);
            try {
                await this.makeApiRequest({
                    method: "POST",
                    url: `https://api.telegram.org/bot${botToken}/editMessageText`,
                    params: {
                        chat_id: community?.platformCommunityId,
                        message_id: post.platformPostId,
                        text: postData.content.text,
                        parse_mode: "HTML",
                    },
                });
            }
            catch (error) {
                console.error("Error updating Telegram message:", error);
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
        if (!post.platformPostId) {
            throw new Error("Platform post ID not found");
        }
        const community = await CommunityModels_1.Community.findById(post.communityId);
        const botToken = this.getAccessToken(connection);
        try {
            await this.makeApiRequest({
                method: "POST",
                url: `https://api.telegram.org/bot${botToken}/deleteMessage`,
                params: {
                    chat_id: community?.platformCommunityId,
                    message_id: post.platformPostId,
                },
            });
            // Delete from local database
            await CommunityModels_1.CommunityPost.findByIdAndDelete(postId);
            return { success: true, message: "Post deleted successfully" };
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.TELEGRAM);
        }
    }
    async schedulePost(connection, communityId, postData, scheduleTime) {
        const community = await this.getCommunityDetails(connection, communityId);
        // Create scheduled post
        const post = await CommunityModels_1.CommunityPost.create({
            communityId: community._id,
            platform: types_1.ComPlatform.TELEGRAM,
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
        const botToken = this.getAccessToken(connection);
        // Telegram only provides member list for groups, not channels
        if (community.type === types_1.CommunityType.CHANNEL) {
            return [];
        }
        try {
            const response = await this.makeApiRequest({
                method: "GET",
                url: `https://api.telegram.org/bot${botToken}/getChatMembersCount`,
                params: {
                    chat_id: community.platformCommunityId,
                },
            });
            // Note: Telegram doesn't provide detailed member list via API
            // You can only get count or individual member info
            return [
                {
                    memberId: "telegram_members",
                    name: "Group Members",
                    role: types_1.CommunityPermission.MEMBER,
                    joinedAt: new Date(),
                },
            ];
        }
        catch (error) {
            console.error("Error fetching Telegram members:", error.message);
            return [];
        }
    }
    async removeMember(connection, communityId, memberId) {
        const community = await this.getCommunityDetails(connection, communityId);
        const botToken = this.getAccessToken(connection);
        try {
            await this.makeApiRequest({
                method: "POST",
                url: `https://api.telegram.org/bot${botToken}/banChatMember`,
                params: {
                    chat_id: community.platformCommunityId,
                    user_id: memberId,
                },
            });
            return { success: true, message: "Member removed successfully" };
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.TELEGRAM);
        }
    }
    async sendMessage(connection, to, message, options) {
        const botToken = this.getAccessToken(connection);
        try {
            const response = await this.makeApiRequest({
                method: "POST",
                url: `https://api.telegram.org/bot${botToken}/sendMessage`,
                params: {
                    chat_id: to,
                    text: message.text,
                    parse_mode: "HTML",
                },
            });
            return {
                success: true,
                messageId: response.result.message_id,
            };
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.TELEGRAM);
        }
    }
    async refreshToken(connection) {
        // Telegram bot tokens don't expire
        return connection;
    }
}
exports.TelegramService = TelegramService;
