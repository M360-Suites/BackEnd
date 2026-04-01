"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignObjective = exports.CampaignStatus = exports.AdsPlatform = void 0;
// ENUMS
var AdsPlatform;
(function (AdsPlatform) {
    AdsPlatform["META"] = "meta";
    AdsPlatform["GOOGLE"] = "google";
    AdsPlatform["TWITTER"] = "twitter";
    AdsPlatform["LINKEDIN"] = "linkedin";
    AdsPlatform["TIKTOK"] = "tiktok";
    AdsPlatform["SNAPCHAT"] = "snapchat";
})(AdsPlatform || (exports.AdsPlatform = AdsPlatform = {}));
var CampaignStatus;
(function (CampaignStatus) {
    CampaignStatus["ACTIVE"] = "ACTIVE";
    CampaignStatus["PAUSED"] = "PAUSED";
    CampaignStatus["DELETED"] = "DELETED";
    CampaignStatus["ARCHIVED"] = "ARCHIVED";
})(CampaignStatus || (exports.CampaignStatus = CampaignStatus = {}));
var CampaignObjective;
(function (CampaignObjective) {
    CampaignObjective["AWARENESS"] = "AWARENESS";
    CampaignObjective["TRAFFIC"] = "TRAFFIC";
    CampaignObjective["ENGAGEMENT"] = "ENGAGEMENT";
    CampaignObjective["LEADS"] = "LEADS";
    CampaignObjective["APP_PROMOTION"] = "APP_PROMOTION";
    CampaignObjective["SALES"] = "SALES";
    CampaignObjective["CONVERSIONS"] = "CONVERSIONS";
    CampaignObjective["VIDEO_VIEWS"] = "VIDEO_VIEWS";
    CampaignObjective["REACH"] = "REACH";
    CampaignObjective["BRAND_AWARENESS"] = "BRAND_AWARENESS";
})(CampaignObjective || (exports.CampaignObjective = CampaignObjective = {}));
