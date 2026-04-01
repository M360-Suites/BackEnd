"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityPost = exports.Community = exports.CommunityMember = exports.CommunityConnection = void 0;
const mongoose_1 = require("mongoose");
const types_1 = require("../Types/types");
const conSchema = new mongoose_1.Schema({
    orgId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    platform: { type: String, required: true, enum: types_1.ComPlatform },
    accessToken: { type: String, required: true },
    accessTokenSecret: { type: String },
    refreshToken: { type: String },
    expiresAt: { type: Date },
    refreshExpiresAt: { type: Date },
    accountId: { type: String },
    accountName: { type: String, required: true },
    scopes: [{ type: String }],
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
}, { timestamps: true });
// Compound index to ensure one connection per platform per org
conSchema.index({ orgId: 1, platform: 1 }, { unique: true });
// Community Model
const communitySchema = new mongoose_1.Schema({
    orgId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    platform: {
        type: String,
        enum: Object.values(types_1.ComPlatform),
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
        enum: Object.values(types_1.CommunityType),
        required: true
    },
    memberCount: {
        type: Number,
        default: 0
    },
    permissions: [{
            type: String,
            enum: Object.values(types_1.CommunityPermission)
        }],
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
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
const communityPostSchema = new mongoose_1.Schema({
    communityId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Community',
        required: true,
        index: true
    },
    platform: {
        type: String,
        enum: Object.values(types_1.ComPlatform),
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
        enum: Object.values(types_1.PostStatusCM),
        default: types_1.PostStatusCM.DRAFT
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    },
    error: {
        type: String
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const communityMemberSchema = new mongoose_1.Schema({
    communityId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        enum: Object.values(types_1.CommunityPermission),
        default: types_1.CommunityPermission.MEMBER
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    lastActiveAt: {
        type: Date
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});
// Compound index for unique member per community
communityMemberSchema.index({ communityId: 1, platformMemberId: 1 }, { unique: true });
const CommunityConnection = (0, mongoose_1.model)("CommunityConnection", conSchema);
exports.CommunityConnection = CommunityConnection;
const Community = (0, mongoose_1.model)("Community", communitySchema);
exports.Community = Community;
const CommunityMember = (0, mongoose_1.model)('CommunityMember', communityMemberSchema);
exports.CommunityMember = CommunityMember;
const CommunityPost = (0, mongoose_1.model)('CommunityPost', communityPostSchema);
exports.CommunityPost = CommunityPost;
