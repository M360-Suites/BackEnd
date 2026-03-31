import { ComPlatformClient } from "./ComPlatformClient";
import {
  ComConInterface,
  CommunityInterface,
  CommunityPostInterface,
  CommunityMember,
  ComPlatform,
  CommunityType,
  CommunityPermission,
  PostStatusCM,
} from "../../../Types/types";
import { Community, CommunityConnection, CommunityPost } from "../../../Models/CommunityModels";
import axios from "axios";
import { encrypt } from "../../../Services/encryption";

export class TelegramService extends ComPlatformClient {
  constructor() {
    super(ComPlatform.TELEGRAM);
  }

  async connectAccount(
    userId: string,
    authCode: string,
    state?: string,
  ): Promise<ComConInterface> {
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
    const connection = await CommunityConnection.findOneAndUpdate(
      { userId, platform: ComPlatform.TELEGRAM },
      {
        userId,
        platform: ComPlatform.TELEGRAM,
        accessToken: encrypt(botToken),
        accountId: botInfo.result.id.toString(),
        accountName: botInfo.result.username || botInfo.result.first_name,
        scopes: ["bot"],
        metadata: {
          botToken,
          botInfo: botInfo.result,
        },
      },
      { upsert: true, new: true },
    );

    return connection;
  }

  async disconnectAccount(connectionId: string): Promise<void> {
    await CommunityConnection.findByIdAndDelete(connectionId);
  }

  async fetchCommunities(
    connection: ComConInterface,
  ): Promise<CommunityInterface[]> {
    const botToken = this.getAccessToken(connection);

    try {
      const communities: CommunityInterface[] = [];

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
        const chat =
          update.message?.chat ||
          update.channel_post?.chat ||
          update.my_chat_member?.chat;

        if (chat && !processedChats.has(chat.id)) {
          processedChats.add(chat.id);

          let communityType = CommunityType.GROUP;
          if (chat.type === "channel") communityType = CommunityType.CHANNEL;
          if (chat.type === "supergroup")
            communityType = CommunityType.COMMUNITY;

          const community = await Community.findOneAndUpdate(
            {
              userId: connection.userId,
              platform: ComPlatform.TELEGRAM,
              platformCommunityId: chat.id.toString(),
            },
            {
              userId: connection.userId,
              platform: ComPlatform.TELEGRAM,
              platformCommunityId: chat.id.toString(),
              name: chat.title || chat.username || `Telegram ${chat.type}`,
              type: communityType,
              memberCount: chat.members_count || 0,
              permissions: [
                CommunityPermission.WRITE,
                CommunityPermission.ADMIN,
              ],
              metadata: {
                chatType: chat.type,
                username: chat.username,
                inviteLink: chat.invite_link,
              },
              isActive: true,
              lastSyncedAt: new Date(),
            },
            { upsert: true, new: true },
          );

          communities.push(community);
        }
      }

      return communities;
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.TELEGRAM);
    }
  }

  async getCommunityDetails(
    connection: ComConInterface,
    communityId: string,
  ): Promise<CommunityInterface> {
    const community = await Community.findOne({
      _id: communityId,
      platform: ComPlatform.TELEGRAM,
      userId: connection.userId,
    });

    if (!community) {
      throw new Error("Community not found");
    }

    return community;
  }

  async createPost(
    connection: ComConInterface,
    communityId: string,
    postData: CommunityPostInterface,
  ): Promise<any> {
    const community = await this.getCommunityDetails(connection, communityId);
    const botToken = this.getAccessToken(connection);

    try {
      let endpoint: string = '';
      let params: any = {
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
      const post = await CommunityPost.create({
        communityId: community._id,
        platform: ComPlatform.TELEGRAM,
        platformPostId: response.result.message_id.toString(),
        content: postData.content,
        status: PostStatusCM.POSTED,
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
    } catch (error: any) {
      // Save failed post
      await CommunityPost.create({
        communityId: community._id,
        platform: ComPlatform.TELEGRAM,
        content: postData.content,
        status: PostStatusCM.FAILED,
        error: error.message,
        createdBy: connection.userId,
      });

      this.handlePlatformError(error, ComPlatform.TELEGRAM);
    }
  }

  async updatePost(
    connection: ComConInterface,
    postId: string,
    postData: Partial<CommunityPostInterface>,
  ): Promise<any> {
    const post = await CommunityPost.findById(postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Telegram allows editing messages
    if (postData.content?.text && post.platformPostId) {
      const community = await Community.findById(post.communityId);
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
      } catch (error) {
        console.error("Error updating Telegram message:", error);
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
      throw new Error("Post not found");
    }

    if (!post.platformPostId) {
      throw new Error("Platform post ID not found");
    }

    const community = await Community.findById(post.communityId);
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
      await CommunityPost.findByIdAndDelete(postId);

      return { success: true, message: "Post deleted successfully" };
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.TELEGRAM);
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
      platform: ComPlatform.TELEGRAM,
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
    const botToken = this.getAccessToken(connection);

    // Telegram only provides member list for groups, not channels
    if (community.type === CommunityType.CHANNEL) {
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
          role: CommunityPermission.MEMBER,
          joinedAt: new Date(),
        },
      ];
    } catch (error: any) {
      console.error("Error fetching Telegram members:", error.message);
      return [];
    }
  }

  async removeMember(
    connection: ComConInterface,
    communityId: string,
    memberId: string,
  ): Promise<any> {
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
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.TELEGRAM);
    }
  }

  async sendMessage(
    connection: ComConInterface,
    to: string,
    message: any,
    options?: any,
  ): Promise<any> {
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
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.TELEGRAM);
    }
  }

  async refreshToken(connection: ComConInterface): Promise<ComConInterface> {
    // Telegram bot tokens don't expire
    return connection;
  }
}
