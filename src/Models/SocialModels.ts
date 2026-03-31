import { model, Schema, Types } from "mongoose";
import { PostStatus, SocialConnection, SocialPlatform } from "../Types/types";

const socialSchema = new Schema(
  {
    orgId: {
      type: Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    platform: { type: String, enum: SocialPlatform, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    accessTokenSecret: { type: String }, // Added for OAuth 1.0a
    expiresAt: { type: Date },
    refreshExpiresAt: { type: Date },
    accountId: { type: String },
    accountName: { type: String, required: true },
    scopes: [{ type: String }],
  },
  { timestamps: true }
);

// Create compound unique index on userId and platform
socialSchema.index({ userId: 1, platform: 1 }, { unique: true });

const SocialConnectionModel = model<SocialConnection>(
  "SocialConnection",
  socialSchema
);

export interface IPost extends Document {
  orgId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  text: string;
  description: string;
  mediaUrl: string;
  mediaType: string;
  platforms: {
    platform: SocialPlatform;
    postId: string;
  }[];
  status: PostStatus;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    text: { type: String },
    description: { type: String },
    mediaUrl: { type: String },
    mediaType: { type: String },
    platforms: [{}],
  },
  { timestamps: true }
);

const Post = model<IPost>("Post", postSchema);

export { Post, SocialConnectionModel };
