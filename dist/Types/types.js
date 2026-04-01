"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostStatusCM = exports.CommunityPermission = exports.CommunityType = exports.ComPlatform = exports.PostStatus = exports.SocialPlatform = void 0;
var SocialPlatform;
(function (SocialPlatform) {
    SocialPlatform["FACEBOOK"] = "facebook";
    SocialPlatform["INSTAGRAM"] = "instagram";
    SocialPlatform["TWITTER"] = "twitter";
    SocialPlatform["YOUTUBE"] = "youtube";
    SocialPlatform["LINKEDIN"] = "linkedin";
    SocialPlatform["TIKTOK"] = "tiktok";
    SocialPlatform["PINTEREST"] = "pinterest";
})(SocialPlatform || (exports.SocialPlatform = SocialPlatform = {}));
var PostStatus;
(function (PostStatus) {
    PostStatus["PUBLISHED"] = "published";
    PostStatus["DRAFT"] = "in draft";
})(PostStatus || (exports.PostStatus = PostStatus = {}));
// COMMUNITY MANAGER TYPES
var ComPlatform;
(function (ComPlatform) {
    ComPlatform["FACEBOOK"] = "facebook";
    ComPlatform["INSTAGRAM"] = "instagram";
    ComPlatform["TWITTER"] = "twitter";
    ComPlatform["LINKEDIN"] = "linkedin";
    ComPlatform["WHATSAPP"] = "whatsapp";
    ComPlatform["TELEGRAM"] = "telegram";
    ComPlatform["DISCORD"] = "discord";
    ComPlatform["SLACK"] = "slack";
})(ComPlatform || (exports.ComPlatform = ComPlatform = {}));
// Community Types
var CommunityType;
(function (CommunityType) {
    CommunityType["GROUP"] = "group";
    CommunityType["PAGE"] = "page";
    CommunityType["CHANNEL"] = "channel";
    CommunityType["SERVER"] = "server";
    CommunityType["WORKSPACE"] = "workspace";
    CommunityType["COMMUNITY"] = "community";
})(CommunityType || (exports.CommunityType = CommunityType = {}));
var CommunityPermission;
(function (CommunityPermission) {
    CommunityPermission["READ"] = "read";
    CommunityPermission["WRITE"] = "write";
    CommunityPermission["ADMIN"] = "admin";
    CommunityPermission["MODERATOR"] = "moderator";
    CommunityPermission["MEMBER"] = "member";
})(CommunityPermission || (exports.CommunityPermission = CommunityPermission = {}));
var PostStatusCM;
(function (PostStatusCM) {
    PostStatusCM["DRAFT"] = "draft";
    PostStatusCM["SCHEDULED"] = "scheduled";
    PostStatusCM["POSTED"] = "posted";
    PostStatusCM["FAILED"] = "failed";
    PostStatusCM["CANCELLED"] = "cancelled";
})(PostStatusCM || (exports.PostStatusCM = PostStatusCM = {}));
