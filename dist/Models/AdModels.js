"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdsConModel = exports.Ads = void 0;
const mongoose_1 = require("mongoose");
const ads_1 = require("../Types/ads");
const conSchema = new mongoose_1.Schema({
    orgId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    platform: { type: String, enum: ads_1.AdsPlatform, required: true },
    accessToken: { type: String, required: true },
    accessTokenSecret: { type: String },
    refreshToken: { type: String },
    expiresAt: { type: Date },
    refreshExpiresAt: { type: Date },
    adAccountIds: [{ type: String }],
    accountName: { type: String, required: true },
    scopes: [{ type: String }],
}, { timestamps: true });
// Compound index for efficient lookups
conSchema.index({ orgId: 1, platform: 1 }, { unique: true });
const AdsConModel = (0, mongoose_1.model)("AdsConnection", conSchema);
exports.AdsConModel = AdsConModel;
const adsSchema = new mongoose_1.Schema({
    orgId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Organization", required: true },
    platforms: [{}],
    name: { type: String },
});
const Ads = (0, mongoose_1.model)("Ads", adsSchema);
exports.Ads = Ads;
