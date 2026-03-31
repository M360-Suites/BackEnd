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
import comOauth from "../Auth/oauth";


export class DiscordService extends ComPlatformClient {
  private discordBotToken: string;

  constructor() {
    super(ComPlatform.DISCORD);
    this.discordBotToken = process.env.DISCORD_BOT_TOKEN!;
  }

  async connectAccount(
    userId: string,
    authCode: string,
    state?: string,
  ): Promise<ComConInterface> {
    if (!state) {
      throw new Error("State parameter is required for Discord OAuth");
    }

    const connection = await comOauth.handleCallback(authCode, state);
    return connection;
  }

  async disconnectAccount(connectionId: string): Promise<void> {
    const connection = await CommunityConnection.findById(connectionId);
    if (!connection) {
      throw new Error("Connection not found");
    }

    await comOauth.revokeConnection(connection);
  }

  async fetchCommunities(
    connection: ComConInterface,
  ): Promise<CommunityInterface[]> {
    const accessToken = this.getAccessToken(connection);

    try {
      const communities: CommunityInterface[] = [];

      // Fetch Discord guilds (servers)
      const guildsResponse = await this.makeApiRequest({
        method: "GET",
        url: "https://discord.com/api/users/@me/guilds",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      for (const guild of guildsResponse) {
        // Check if bot is in this guild
        const botInGuild = await this.checkBotInGuild(guild.id);
        if (!botInGuild) continue;

        const community = await Community.findOneAndUpdate(
          {
            userId: connection.userId,
            platform: ComPlatform.DISCORD,
            platformCommunityId: guild.id,
          },
          {
            userId: connection.userId,
            platform: ComPlatform.DISCORD,
            platformCommunityId: guild.id,
            name: guild.name,
            avatar: guild.icon
              ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
              : undefined,
            type: CommunityType.SERVER,
            permissions: guild.permissions
              ? this.mapDiscordPermissions(guild.permissions)
              : [CommunityPermission.WRITE],
            metadata: {
              icon: guild.icon,
              owner: guild.owner,
              permissions: guild.permissions,
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
      this.handlePlatformError(error, ComPlatform.DISCORD);
    }
  }

  private async checkBotInGuild(guildId: string): Promise<boolean> {
    try {
      await this.makeApiRequest({
        method: "GET",
        url: `https://discord.com/api/guilds/${guildId}`,
        headers: { Authorization: `Bot ${this.discordBotToken}` },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  private mapDiscordPermissions(permissions: number): CommunityPermission[] {
    const perms: CommunityPermission[] = [];

    // Administrator permission (0x8)
    if ((permissions & 0x8) === 0x8) {
      perms.push(CommunityPermission.ADMIN);
    }

    // Manage Messages permission (0x2000)
    if ((permissions & 0x2000) === 0x2000) {
      perms.push(CommunityPermission.MODERATOR);
    }

    // Send Messages permission (0x800)
    if ((permissions & 0x800) === 0x800) {
      perms.push(CommunityPermission.WRITE);
    }

    // Read Messages permission (0x400)
    if ((permissions & 0x400) === 0x400) {
      perms.push(CommunityPermission.READ);
    }

    return perms.length > 0 ? perms : [CommunityPermission.MEMBER];
  }

  async getCommunityDetails(
    connection: ComConInterface,
    communityId: string,
  ): Promise<CommunityInterface> {
    const community = await Community.findOne({
      _id: communityId,
      platform: ComPlatform.DISCORD,
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

    // Discord requires channel ID, not server ID
    const channelId = postData.metadata?.channelId;
    if (!channelId) {
      throw new Error("Channel ID is required for Discord posts");
    }

    try {
      const data: any = {
        content: postData.content.text,
      };

      // Handle embeds for links
      if (postData.content.link) {
        data.embeds = [
          {
            title: postData.content.linkPreview?.title || "Link",
            description:
              postData.content.linkPreview?.description ||
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
      const post = await CommunityPost.create({
        communityId: community._id,
        platform: ComPlatform.DISCORD,
        platformPostId: response.id,
        content: postData.content,
        status: PostStatusCM.POSTED,
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
    } catch (error: any) {
      // Save failed post
      await CommunityPost.create({
        communityId: community._id,
        platform: ComPlatform.DISCORD,
        content: postData.content,
        status: PostStatusCM.FAILED,
        error: error.message,
        createdBy: connection.userId,
        metadata: {
          channelId,
        },
      });

      this.handlePlatformError(error, ComPlatform.DISCORD);
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

    // Discord allows editing messages
    if (
      postData.content?.text &&
      post.platformPostId &&
      post.metadata?.channelId
    ) {
      try {
        const data: any = {
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
      } catch (error) {
        console.error("Error updating Discord message:", error);
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
      await CommunityPost.findByIdAndDelete(postId);

      return { success: true, message: "Post deleted successfully" };
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.DISCORD);
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
      platform: ComPlatform.DISCORD,
      content: postData.content,
      scheduledAt: scheduleTime,
      status: PostStatusCM.SCHEDULED,
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

  async fetchMembers(
    connection: ComConInterface,
    communityId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<CommunityMember[]> {
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

      return response.map((member: any) => ({
        memberId: member.user.id,
        username: member.user.username,
        name: member.user.global_name || member.user.username,
        role: this.mapDiscordRole(member.roles),
        joinedAt: new Date(member.joined_at),
      }));
    } catch (error: any) {
      console.error("Error fetching Discord members:", error.message);
      return [];
    }
  }

  private mapDiscordRole(roles: string[]): CommunityPermission {
    // This would require checking role permissions
    // Simplified implementation
    return CommunityPermission.MEMBER;
  }

  async removeMember(
    connection: ComConInterface,
    communityId: string,
    memberId: string,
  ): Promise<any> {
    const community = await this.getCommunityDetails(connection, communityId);

    try {
      await this.makeApiRequest({
        method: "DELETE",
        url: `https://discord.com/api/guilds/${community.platformCommunityId}/members/${memberId}`,
        headers: { Authorization: `Bot ${this.discordBotToken}` },
      });

      return { success: true, message: "Member removed successfully" };
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.DISCORD);
    }
  }

  async sendMessage(
    connection: ComConInterface,
    to: string,
    message: any,
    options?: any,
  ): Promise<any> {
    try {
      const data: any = {
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
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.DISCORD);
    }
  }

  async refreshToken(connection: ComConInterface): Promise<ComConInterface> {
    // Discord tokens expire, need to refresh
    return await comOauth.refreshToken(connection);
  }

  // Discord-specific methods
  async getChannels(
    connection: ComConInterface,
    guildId: string,
  ): Promise<any[]> {
    try {
      const response = await this.makeApiRequest({
        method: "GET",
        url: `https://discord.com/api/guilds/${guildId}/channels`,
        headers: { Authorization: `Bot ${this.discordBotToken}` },
      });

      return response;
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.DISCORD);
    }
  }
}
