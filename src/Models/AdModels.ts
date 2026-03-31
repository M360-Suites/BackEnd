import { model, Schema, Types } from "mongoose";
import { Campaign, AdsConnection, AdsPlatform } from "../Types/ads";

const conSchema = new Schema(
  {
    orgId: {
      type: Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    platform: { type: String, enum: AdsPlatform, required: true },
    accessToken: { type: String, required: true },
    accessTokenSecret: { type: String },
    refreshToken: { type: String },
    expiresAt: { type: Date },
    refreshExpiresAt: { type: Date },
    adAccountIds: [{ type: String }],
    accountName: { type: String, required: true },
    scopes: [{ type: String }],
  },
  { timestamps: true }
);

// Compound index for efficient lookups
conSchema.index({ orgId: 1, platform: 1 }, { unique: true });

const AdsConModel = model<AdsConnection>("AdsConnection", conSchema);

const adsSchema = new Schema<Campaign>({
  orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  platforms: [{}],
  name: { type: String },
});

const Ads = model<Campaign>("Ads", adsSchema);

export { Ads, AdsConModel };
