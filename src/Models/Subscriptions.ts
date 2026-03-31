import mongoose, { Document, model, Schema, Types } from "mongoose";
import {
  Currency,
  IPaymentRecord,
  ISubsriptionPlan,
  PaymentStatus,
  SubScriptionInterval,
  SubscriptionTier,
} from "../Types/payment";

export interface IPlan extends Document {
  planCode: string;
  name: string;
  amount: number; // in kobo
  features: string[];
  interval: "monthly" | "yearly";
  isActive: boolean;
  paystackPlanCode: string | null;
  createdAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    planCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    features: [{ type: String }],
    interval: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
    isActive: { type: Boolean, default: true },
    paystackPlanCode: { type: String, default: null },
  },
  { timestamps: true },
);

export const Plan = mongoose.model<IPlan>("Plan", PlanSchema);


const recordSchema = new Schema<IPaymentRecord>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      // required: true,
    },
    isSubscription: Boolean,
    // plan: {
    //   type: Schema.Types.ObjectId,
    //   ref: "SubscriptionPlan",
    // },
    // plan_code: String,
    features: [{type: String}],
    amountPaid: Number,
    reference: {
      type: String,
      unique: true
    },
    email: {
      type: String,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
    },
  },
  { timestamps: true }
);

const usageRecSchema = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    feature: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
    },
    period: {
      type: String, // Format: "2024-01" for monthly
      required: true,
    },
  },
  { timestamps: true }
);

usageRecSchema.index({ orgId: 1, feature: 1, period: 1 }, { unique: true });

const UsageRecord = model("UsageRecord", usageRecSchema);

const PaymentRecord = model<IPaymentRecord>(
  "SubscriptionRecord",
  recordSchema
);


export interface IBillingEvent extends Document {
  organizationId: mongoose.Types.ObjectId;
  eventType: string;
  paystackReference: string | null;
  amount: number;
  status: "pending" | "success" | "failed";
  metadata: Record<string, any>;
  createdAt: Date;
}

const BillingEventSchema = new Schema<IBillingEvent>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    eventType: { type: String, required: true },
    paystackReference: { type: String, default: null },
    amount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const BillingEvent = mongoose.model<IBillingEvent>(
  "BillingEvent",
  BillingEventSchema,
);


export { PaymentRecord, UsageRecord };
