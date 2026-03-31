import { decrypt } from "../../../Services/encryption";
import {
  PostContent,
  PostResult,
  SocialConnection,
  SocialPlatform,
} from "../../../Types/types";

export abstract class BasePoster {
  constructor(protected connection: SocialConnection) {}

  abstract post(content: PostContent): Promise<PostResult>;

  protected getAccessToken(): string {
    return decrypt(this.connection.accessToken);
  }

  protected getRefreshToken(): string | undefined {
    const refreshToken = this.connection.refreshToken
      ? decrypt(this.connection.refreshToken)
      : undefined;
    return refreshToken;
  }

  protected getConnection(): SocialConnection {
    return this.connection;
  }

  protected createResult(
    success: boolean,
    postId?: string,
    error?: string
  ): PostResult {
    return {
      success,
      postId,
      error,
      platform: this.connection.platform,
    };
  }
}
