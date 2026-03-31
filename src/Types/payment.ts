import { config } from "dotenv";
import { Schema, Types } from "mongoose";
config();

export const channels = [
  "card",
  "bank",
  "apple_pay",
  "ussd",
  "qr",
  "mobile_money",
  "bank_transfer",
  "eft",
  "payattitude",
];

export interface InitTransaction {
  email: string;
  amount: number;
  currency: Currency;
  channels: string[];
  reference: string;
  callback_url: string;
  metadata?: object;
}

export enum Currency {
  NGN = "NGN",
  USD = "USD",
  GHS = "GHS",
  ZAR = "ZAR",
  KES = "KES",
  XOF = "XOF",
}

export enum SubScriptionInterval {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  QUATERLY = "quarterly",
  ANNUALLY = "annually",
}

export enum PaymentStatus {
  SUCCESS = "success",
  PENDING = "pending",
  FAILED = "failed",
}

export enum SubscriptionTier {
  FREE = "free",
  LAUNCH = "launch",
  SCALE = "scale",
  ENTERPRISE = "enterprise",
}

export enum BillingStatus {
  TRIAL = "trial",
  ACTIVE = "active",
  PAST_DUE = "past_due",
  CANCELED = "canceled",
}


export interface SubscriptionFeatures {
  // Project Limits
  maxProjects: number;
  maxTeamMembers: number;
  storageGB: number;

  // Feature Flags
  advancedAnalytics: boolean;
  apiAccess: boolean;
  customDomains: boolean;
  prioritySupport: boolean;

  // Usage Limits
  apiCallsPerMonth?: number;
  exportsPerMonth?: number;
  templatesAccess?: number;
}

export interface ISubsriptionPlan extends Document {
  tier: SubscriptionTier;
  name: string;
  plan_code: string;
  interval: SubScriptionInterval;
  description: string;
  amount: number;
  currency: Currency;
  plan_id: string;
  features: SubscriptionFeatures;
  limits: {
    maxProjects?: number;
    maxTeamMembers?: number;
    storageGB?: number;
    apiCallsPerMonth?: number;
  };
  createdAt: Date;
  updateAd: Date;
}

export interface IPaymentRecord {
  orgId: Types.ObjectId;
  isSubscription: boolean;
  // plan?: Types.ObjectId;
  // plan_code?: string;
  features: string[];
  amountPaid: number;
  reference: string;
  email: string;
  paymentStatus: PaymentStatus;
  subscriptionStatus: "trial" | "active" | "past_due" | "suspended";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  paystackSubscriptionId?: string;
  // features?: {
  //   [key: string]: number | boolean;
  // };
  createdAt: Date;
  updateAd: Date;
}

export interface TrxDet {
  isSubscription?: boolean;
  orgId?: Schema.Types.ObjectId;
  // plan?: Types.ObjectId;
  // plan_code?: string;
  features?: string[];
  amountPaid?: number;
  email?: string;
  status?: PaymentStatus;
  reference?: string;
}

export const FEATURE_PRICES: Record<string, number> = {
  creative_generator: Number(process.env.CREATIVE_GENERATOR!) * 100,
  email_automation: Number(process.env.EMAIL_AUTOMATION!) * 100,
  social_scheduler: Number(process.env.SOCIAL_SCHEDULER!) * 100,
  community_manager: Number(process.env.COMMUNITY_MANAGER!) * 100,
  ads_manager: Number(process.env.ADS_MANAGER!) * 100,
  seo_toolkit: Number(process.env.SEO_TOOLKIT!) * 100,
};

export const BASE_PLAN_AMOUNT = Number(process.env.BASE_PLAN_AMOUNT!); // minimal Paystack plan