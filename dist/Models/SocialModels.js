"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialConnectionModel = exports.Post = void 0;
const mongoose_1 = require("mongoose");
const types_1 = require("../Types/types");
const socialSchema = new mongoose_1.Schema({
    orgId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    platform: { type: String, enum: types_1.SocialPlatform, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    accessTokenSecret: { type: String }, // Added for OAuth 1.0a
    expiresAt: { type: Date },
    refreshExpiresAt: { type: Date },
    accountId: { type: String },
    accountName: { type: String, required: true },
    scopes: [{ type: String }],
}, { timestamps: true });
// Create compound unique index on userId and platform
socialSchema.index({ userId: 1, platform: 1 }, { unique: true });
const SocialConnectionModel = (0, mongoose_1.model)("SocialConnection", socialSchema);
exports.SocialConnectionModel = SocialConnectionModel;
const postSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    orgId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
    },
    text: { type: String },
    description: { type: String },
    mediaUrl: { type: String },
    mediaType: { type: String },
    platforms: [{}],
}, { timestamps: true });
const Post = (0, mongoose_1.model)("Post", postSchema);
exports.Post = Post;
