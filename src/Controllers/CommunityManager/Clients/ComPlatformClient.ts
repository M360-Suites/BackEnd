import { decrypt } from "../../../Services/encryption";
import {
  ICommunityPlatformService,
  ComConInterface,
  CommunityInterface,
  CommunityPostInterface,
  CommunityMember,
} from "../../../Types/types";
import axios, { AxiosError } from "axios";

export abstract class ComPlatformClient implements ICommunityPlatformService {
  protected platform: string;

  constructor(platform: string) {
    this.platform = platform;
  }

  abstract connectAccount(
    userId: string,
    authCode: string,
    state?: string,
  ): Promise<ComConInterface>;
  abstract disconnectAccount(connectionId: string): Promise<void>;
  abstract fetchCommunities(
    connection: ComConInterface,
  ): Promise<CommunityInterface[]>;
  abstract getCommunityDetails(
    connection: ComConInterface,
    communityId: string,
  ): Promise<CommunityInterface>;
  abstract createPost(
    connection: ComConInterface,
    communityId: string,
    postData: CommunityPostInterface,
  ): Promise<any>;
  abstract updatePost(
    connection: ComConInterface,
    postId: string,
    postData: Partial<CommunityPostInterface>,
  ): Promise<any>;
  abstract deletePost(
    connection: ComConInterface,
    postId: string,
  ): Promise<any>;
  abstract schedulePost(
    connection: ComConInterface,
    communityId: string,
    postData: CommunityPostInterface,
    scheduleTime: Date,
  ): Promise<any>;
  abstract fetchMembers(
    connection: ComConInterface,
    communityId: string,
    limit?: number,
    offset?: number,
  ): Promise<CommunityMember[]>;
  abstract removeMember(
    connection: ComConInterface,
    communityId: string,
    memberId: string,
  ): Promise<any>;
  abstract sendMessage(
    connection: ComConInterface,
    to: string,
    message: any,
    options?: any,
  ): Promise<any>;
  abstract refreshToken(connection: ComConInterface): Promise<ComConInterface>;

  protected getAccessToken(connection: ComConInterface): string {
    return decrypt(connection.accessToken);
  }

  protected async makeApiRequest(config: any, retries = 3): Promise<any> {
    try {
      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      if (retries > 0 && error.response?.status === 429) {
        // Rate limited, wait and retry
        const delay = Math.pow(2, 3 - retries) * 1000; // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.makeApiRequest(config, retries - 1);
      }
      throw error;
    }
  }

  protected handlePlatformError(error: AxiosError, platform: string): never {
    console.error(`Platform ${platform} API error:`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    throw new Error(`Platform ${platform} API error: ${error.message}`);
  }
}
