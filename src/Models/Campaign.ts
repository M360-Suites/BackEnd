import { Document, model, Schema, Types } from "mongoose";

export enum CampaignType {
  oneTime = "One_Time",
  drip = "Drip",
}

export interface ICampaign extends Document {
  type: CampaignType;
  org: Schema.Types.ObjectId;
  name: string;
  status: string;
  from: string;
  subject: string;
  contents: string;
  recipients: Schema.Types.ObjectId[];
  messageId: string;
  files: string[];
  links: string[];
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
}

export interface ISubscriber extends Document {
  subscribee: Schema.Types.ObjectId;
  email: string;
  name: string;
  source: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  campaigns: ICampaign[];
}

const campaignSchema = new Schema(
  {
    org: {
      type: Types.ObjectId,
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
        type: Types.ObjectId,
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
  },
  { timestamps: true }
);

const subscribersSchema = new Schema({
  subscribee: {
    type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      default: [],
    },
  ],
});

export interface IEmailCredential extends Document {
  orgId: Schema.Types.ObjectId;
  provider: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpPassword: string;
  accountName?: string;
  providerId: string;
  location: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailCredentialSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
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
  },
  { timestamps: true }
);

const Campaign = model<ICampaign>("Campaign", campaignSchema);
const Subscriber = model<ISubscriber>("Subscribers", subscribersSchema);
const EmailCredential = model<IEmailCredential>(
  "EmailCredential",
  EmailCredentialSchema
);

export { Campaign, Subscriber, EmailCredential };
