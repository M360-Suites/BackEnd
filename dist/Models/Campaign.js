"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailCredential = exports.Subscriber = exports.Campaign = exports.CampaignType = void 0;
const mongoose_1 = require("mongoose");
var CampaignType;
(function (CampaignType) {
    CampaignType["oneTime"] = "One_Time";
    CampaignType["drip"] = "Drip";
})(CampaignType || (exports.CampaignType = CampaignType = {}));
const campaignSchema = new mongoose_1.Schema({
    org: {
        type: mongoose_1.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    type: {
        type: String,
        enum: Object.values(CampaignType),
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        default: "completed",
    },
    from: {
        type: String,
        required: true,
    },
    subject: {
        type: String,
        required: true,
    },
    recipients: [
        {
            type: mongoose_1.Types.ObjectId,
            ref: "Subscriber",
            default: [],
        },
    ],
    contents: [
        {
            type: String,
            required: true,
        },
    ],
    messageId: String,
    files: {
        type: [String],
        default: [],
    },
    links: {
        type: [String],
        default: [],
    },
    totalSent: {
        type: Number,
        default: 0,
    },
    totalDelivered: {
        type: Number,
        default: 0,
    },
    totalOpened: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });
const subscribersSchema = new mongoose_1.Schema({
    subscribee: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    source: {
        type: String,
        required: true,
        default: "Imported",
    },
    status: {
        type: String,
        enum: ["Active", "High", "Average", "Low"],
        default: "Active",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    campaigns: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Campaign",
            default: [],
        },
    ],
});
const EmailCredentialSchema = new mongoose_1.Schema({
    orgId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Organization", required: true },
    provider: {
        type: String,
        enum: ["google", "microsoft", "zoho", "custom"],
        required: true,
    },
    email: { type: String, required: true },
    accessToken: String,
    refreshToken: String,
    smtpHost: String,
    smtpPort: Number,
    smtpSecure: Boolean,
    smtpPassword: String,
    accountName: { type: String },
    providerId: String,
    location: String,
}, { timestamps: true });
const Campaign = (0, mongoose_1.model)("Campaign", campaignSchema);
exports.Campaign = Campaign;
const Subscriber = (0, mongoose_1.model)("Subscribers", subscribersSchema);
exports.Subscriber = Subscriber;
const EmailCredential = (0, mongoose_1.model)("EmailCredential", EmailCredentialSchema);
exports.EmailCredential = EmailCredential;
