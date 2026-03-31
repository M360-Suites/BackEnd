import { model, Schema, Types } from "mongoose";
import { ComConInterface, CommunityInterface, CommunityMemberInterface, CommunityPermission, CommunityPostInterface, CommunityType, ComPlatform, MediaAttachment, PostStatusCM } from "../Types/types";


const conSchema = new Schema(
  {
    orgId: {
      type: Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    platform: { type: String, required: true, enum: ComPlatform },
    accessToken: { type: String, required: true },
    accessTokenSecret: { type: String },
    refreshToken: { type: String },
    expiresAt: { type: Date },
    refreshExpiresAt: { type: Date },
    accountId: { type: String },
    accountName: { type: String, required: true },
    scopes: [{ type: String }],
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

// Compound index to ensure one connection per platform per org
conSchema.index({ orgId: 1, platform: 1 }, { unique: true });


// Community Model
const communitySchema = new Schema({
  orgId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  platform: {
    type: String,
    enum: Object.values(ComPlatform),
    required: true
  },
  platformCommunityId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  avatar: {
    type: String
  },
  type: {
    type: String,
    enum: Object.values(CommunityType),
    required: true
  },
  memberCount: {
    type: Number,
    default: 0
  },
  permissions: [{
    type: String,
    enum: Object.values(CommunityPermission)
  }],
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSyncedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for unique community per platform
communitySchema.index({ orgId: 1, platform: 1, platformCommunityId: 1 }, { unique: true });



// Community Post Model
const communityPostSchema = new Schema({
  communityId: {
    type: Schema.Types.ObjectId,
    ref: 'Community',
    required: true,
    index: true
  },
  platform: {
    type: String,
    enum: Object.values(ComPlatform),
    required: true
  },
  platformPostId: {
    type: String,
    index: true
  },
  content: {
    text: {
      type: String
    },
    media: [{
      url: String,
      type: {
        type: String,
        enum: ['image', 'video', 'document', 'audio', 'link']
      },
      thumbnail: String,
      size: Number,
      duration: Number,
      name: String
    }],
    link: {
      type: String
    },
    linkPreview: {
      title: String,
      description: String,
      image: String,
      url: String
    }
  },
  scheduledAt: {
    type: Date,
    index: true
  },
  postedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: Object.values(PostStatusCM),
    default: PostStatusCM.DRAFT
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  error: {
    type: String
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for scheduled posts
communityPostSchema.index({ status: 1, scheduledAt: 1 });
communityPostSchema.index({ platformPostId: 1, platform: 1 }, { unique: true, sparse: true });



// Community Member Model
const communityMemberSchema = new Schema({
  communityId: {
    type: Schema.Types.ObjectId,
    ref: 'Community',
    required: true,
    index: true
  },
  platformMemberId: {
    type: String,
    required: true,
    index: true
  },
  username: {
    type: String
  },
  name: {
    type: String
  },
  email: {
    type: String
  },
  role: {
    type: String,
    enum: Object.values(CommunityPermission),
    default: CommunityPermission.MEMBER
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastActiveAt: {
    type: Date
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Compound index for unique member per community
communityMemberSchema.index({ communityId: 1, platformMemberId: 1 }, { unique: true });


const CommunityConnection = model<ComConInterface>("CommunityConnection", conSchema);

const Community = model<CommunityInterface>("Community", communitySchema);

const CommunityMember = model<CommunityMemberInterface>('CommunityMember', communityMemberSchema);

const CommunityPost = model<CommunityPostInterface>('CommunityPost', communityPostSchema);

export { CommunityConnection, CommunityMember, Community, CommunityPost };