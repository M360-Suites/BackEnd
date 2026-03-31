import { Document, Types } from "mongoose";

// POSTING TYPES
export interface SocialConnection extends Document {
  userId: Types.ObjectId;
  platform: SocialPlatform;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  refreshExpiresAt?: Date;
  accountId: string;
  accountName: string;
  scopes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum SocialPlatform {
  FACEBOOK = "facebook",
  INSTAGRAM = "instagram",
  TWITTER = "twitter",
  YOUTUBE = "youtube",
  LINKEDIN = "linkedin",
  TIKTOK = "tiktok",
  PINTEREST = "pinterest",
}

export enum PostStatus {
  PUBLISHED = "published",
  DRAFT = "in draft",
}

export interface PostContent {
  text?: string;
  files?: Array<{
    path: string;
    mimetype: string;
    size: number;
    originalname: string;
    pipe?: any;
  }>;
  file?: {
    path: string;
    mimetype: string;
    size: number;
    originalname: string;
    pipe?: any;
  };
  imageUrl?: string;
  videoUrl?: string;
  title?: string;
  description?: string;
  privacyStatus?: "public" | "private" | "unlisted";
  scheduledAt?: Date;
}

export interface PostResult {
  success: boolean;
  postId?: string;
  error?: string;
  platform: SocialPlatform;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
  lastingTokenUrl?: string;
  refreshUrl?: string;
}

// COMMUNITY MANAGER TYPES
export enum ComPlatform {
  FACEBOOK = "facebook",
  INSTAGRAM = "instagram",
  TWITTER = "twitter",
  LINKEDIN = "linkedin",
  WHATSAPP = "whatsapp",
  TELEGRAM = "telegram",
  DISCORD = "discord",
  SLACK = "slack",
}

export interface ComConInterface extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  orgId?: Types.ObjectId;
  platform: ComPlatform;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  refreshExpiresAt?: Date;
  accountId: string;
  accountName: string;
  scopes: string[];
  metadata?: {
    businessAccountId?: string;
    phoneNumberId?: string;
    wabaId?: string;
    pageId?: string;
    groupId?: string;
    workspaceId?: string;
    serverId?: string;
    channelId?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ComOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
  lastingTokenUrl?: string;
  refreshUrl?: string;
}

// Community Types
export enum CommunityType {
  GROUP = "group",
  PAGE = "page",
  CHANNEL = "channel",
  SERVER = "server",
  WORKSPACE = "workspace",
  COMMUNITY = "community",
}

export enum CommunityPermission {
  READ = "read",
  WRITE = "write",
  ADMIN = "admin",
  MODERATOR = "moderator",
  MEMBER = "member",
}

export enum PostStatusCM {
  DRAFT = "draft",
  SCHEDULED = "scheduled",
  POSTED = "posted",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export interface CommunityMember {
  memberId: string;
  username?: string;
  name?: string;
  email?: string;
  role: CommunityPermission;
  joinedAt: Date;
}

export interface MediaAttachment {
  url: string;
  type: "image" | "video" | "document" | "audio" | "link";
  thumbnail?: string;
  size?: number;
  duration?: number;
  name?: string;
}

// // MODELS
// COMUNITY CONNECTION
export interface ComConInterface extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  orgId?: Types.ObjectId;
  platform: ComPlatform;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  refreshExpiresAt?: Date;
  accountId: string;
  accountName: string;
  scopes: string[];
  metadata?: {
    businessAccountId?: string;
    phoneNumberId?: string;
    wabaId?: string;
    pageId?: string;
    groupId?: string;
    workspaceId?: string;
    serverId?: string;
    channelId?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

// COMMUNITY 
export interface CommunityInterface extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  orgId: Types.ObjectId;
  platform: ComPlatform;
  platformCommunityId: string;
  name: string;
  description?: string;
  avatar?: string;
  type: CommunityType;
  memberCount: number;
  permissions: CommunityPermission[];
  metadata: {
    [key: string]: any;
  };
  isActive: boolean;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// COMMUNITY POST
export interface CommunityPostInterface extends Document {
  _id: Types.ObjectId;
  communityId: Types.ObjectId;
  platform: ComPlatform;
  platformPostId?: string;
  content: {
    text?: string;
    media?: MediaAttachment[];
    link?: string;
    linkPreview?: {
      title?: string;
      description?: string;
      image?: string;
      url: string;
    };
  };
  scheduledAt?: Date;
  postedAt?: Date;
  status: PostStatusCM;
  metadata: {
    [key: string]: any;
  };
  error?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// COMMUNITY MEMBER
export interface CommunityMemberInterface extends Document {
  _id: Types.ObjectId;
  communityId: Types.ObjectId;
  platformMemberId: string;
  username?: string;
  name?: string;
  email?: string;
  role: CommunityPermission;
  joinedAt: Date;
  lastActiveAt?: Date;
  metadata: {
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}


// Platform Service Interface
export interface ICommunityPlatformService {
  connectAccount(userId: string, authCode: string, state?: string): Promise<ComConInterface>;
  disconnectAccount(connectionId: string): Promise<void>;
  fetchCommunities(connection: ComConInterface): Promise<CommunityInterface[]>;
  getCommunityDetails(connection: ComConInterface, communityId: string): Promise<CommunityInterface>;
  createPost(connection: ComConInterface, communityId: string, postData: CommunityPostInterface): Promise<any>;
  updatePost(connection: ComConInterface, postId: string, postData: Partial<CommunityPostInterface>): Promise<any>;
  deletePost(connection: ComConInterface, postId: string): Promise<any>;
  schedulePost(connection: ComConInterface, communityId: string, postData: CommunityPostInterface, scheduleTime: Date): Promise<any>;
  fetchMembers(connection: ComConInterface, communityId: string, limit?: number, offset?: number): Promise<CommunityMember[]>;
  removeMember(connection: ComConInterface, communityId: string, memberId: string): Promise<any>;
  sendMessage(connection: ComConInterface, to: string, message: any, options?: any): Promise<any>;
  refreshToken(connection: ComConInterface): Promise<ComConInterface>;
}