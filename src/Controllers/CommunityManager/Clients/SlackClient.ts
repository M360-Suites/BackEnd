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
import axios from "axios";

export class SlackService extends ComPlatformClient {
  constructor() {
    super(ComPlatform.SLACK);
  }

  async connectAccount(
    userId: string,
    authCode: string,
    state?: string,
  ): Promise<ComConInterface> {
    if (!state) {
      throw new Error("State parameter is required for Slack OAuth");
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

      // Fetch Slack workspaces
      const workspaceResponse = await this.makeApiRequest({
        method: "GET",
        url: "https://slack.com/api/team.info",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (workspaceResponse.team) {
        const workspace = workspaceResponse.team;

        const community = await Community.findOneAndUpdate(
          {
            orgId: connection.orgId,
            platform: ComPlatform.SLACK,
            platformCommunityId: workspace.id,
          },
          {
            orgId: connection.orgId,
            platform: ComPlatform.SLACK,
            platformCommunityId: workspace.id,
            name: workspace.name,
            avatar: workspace.icon?.image_230,
            type: CommunityType.WORKSPACE,
            permissions: [CommunityPermission.WRITE],
            metadata: {
              domain: workspace.domain,
              icon: workspace.icon,
            },
            isActive: true,
            lastSyncedAt: new Date(),
          },
          { upsert: true, new: true },
        );

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
        const community = await Community.findOneAndUpdate(
          {
            orgId: connection.orgId,
            platform: ComPlatform.SLACK,
            platformCommunityId: channel.id,
          },
          {
            orgId: connection.orgId,
            platform: ComPlatform.SLACK,
            platformCommunityId: channel.id,
            name: `#${channel.name}`,
            description: channel.purpose?.value,
            type: CommunityType.CHANNEL,
            memberCount: channel.num_members,
            permissions: channel.is_member
              ? [CommunityPermission.WRITE]
              : [CommunityPermission.READ],
            metadata: {
              isPrivate: channel.is_private,
              isArchived: channel.is_archived,
              creator: channel.creator,
              created: channel.created,
            },
            isActive: !channel.is_archived,
            lastSyncedAt: new Date(),
          },
          { upsert: true, new: true },
        );

        communities.push(community);
      }

      return communities;
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.SLACK);
    }
  }

  async getCommunityDetails(
    connection: ComConInterface,
    communityId: string,
  ): Promise<CommunityInterface> {
    const community = await Community.findOne({
      _id: communityId,
      platform: ComPlatform.SLACK,
      orgId: connection.orgId,
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
    const accessToken = this.getAccessToken(connection);

    try {
      const data: any = {
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
      const post = await CommunityPost.create({
        communityId: community._id,
        platform: ComPlatform.SLACK,
        platformPostId: response.ts,
        content: postData.content,
        status: PostStatusCM.POSTED,
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
    } catch (error: any) {
      // Save failed post
      await CommunityPost.create({
        communityId: community._id,
        platform: ComPlatform.SLACK,
        content: postData.content,
        status: PostStatusCM.FAILED,
        error: error.message,
        createdBy: connection.orgId,
      });

      this.handlePlatformError(error, ComPlatform.SLACK);
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

    // Slack allows updating messages
    if (
      postData.content?.text &&
      post.platformPostId &&
      post.metadata?.channel
    ) {
      const accessToken = this.getAccessToken(connection);

      try {
        const data: any = {
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
      } catch (error) {
        console.error("Error updating Slack message:", error);
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
      await CommunityPost.findByIdAndDelete(postId);

      return { success: true, message: "Post deleted successfully" };
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.SLACK);
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
      platform: ComPlatform.SLACK,
      content: postData.content,
      scheduledAt: scheduleTime,
      status: PostStatusCM.SCHEDULED,
      createdBy: connection.orgId,
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
    const accessToken = this.getAccessToken(connection);

    // For channels, get members
    if (community.type === CommunityType.CHANNEL) {
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
        const members: CommunityMember[] = [];

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
              role: CommunityPermission.MEMBER, // Slack doesn't provide channel-specific roles
              joinedAt: new Date(userResponse.user.updated * 1000),
            });
          }
        }

        return members;
      } catch (error: any) {
        console.error("Error fetching Slack members:", error.message);
        return [];
      }
    }

    return [];
  }

  async removeMember(
    connection: ComConInterface,
    communityId: string,
    memberId: string,
  ): Promise<any> {
    // Slack doesn't support removing members from channels via API
    throw new Error(
      "Slack API does not support removing members from channels",
    );
  }

  async sendMessage(
    connection: ComConInterface,
    to: string,
    message: any,
    options?: any,
  ): Promise<any> {
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
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.SLACK);
    }
  }

  async refreshToken(connection: ComConInterface): Promise<ComConInterface> {
    return await comOauth.refreshToken(connection);
  }

  // Slack-specific methods
  async getChannelInfo(
    connection: ComConInterface,
    channelId: string,
  ): Promise<any> {
    const accessToken = this.getAccessToken(connection);

    try {
      const response = await this.makeApiRequest({
        method: "GET",
        url: "https://slack.com/api/conversations.info",
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { channel: channelId },
      });

      return response.channel;
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.SLACK);
    }
  }
}
