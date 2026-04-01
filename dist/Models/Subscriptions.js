"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageRecord = exports.PaymentRecord = exports.BillingEvent = exports.Plan = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const payment_1 = require("../Types/payment");
const PlanSchema = new mongoose_1.Schema({
    planCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    features: [{ type: String }],
    interval: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
    isActive: { type: Boolean, default: true },
    paystackPlanCode: { type: String, default: null },
}, { timestamps: true });
exports.Plan = mongoose_1.default.model("Plan", PlanSchema);
const recordSchema = new mongoose_1.Schema({
    orgId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        // required: true,
    },
    isSubscription: Boolean,
    // plan: {
    //   type: Schema.Types.ObjectId,
    //   ref: "SubscriptionPlan",
    // },
    // plan_code: String,
    features: [{ type: String }],
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
        enum: Object.values(payment_1.PaymentStatus),
    },
}, { timestamps: true });
const usageRecSchema = new mongoose_1.Schema({
    orgId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, { timestamps: true });
usageRecSchema.index({ orgId: 1, feature: 1, period: 1 }, { unique: true });
const UsageRecord = (0, mongoose_1.model)("UsageRecord", usageRecSchema);
exports.UsageRecord = UsageRecord;
const PaymentRecord = (0, mongoose_1.model)("SubscriptionRecord", recordSchema);
exports.PaymentRecord = PaymentRecord;
const BillingEventSchema = new mongoose_1.Schema({
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
    metadata: { type: mongoose_1.Schema.Types.Mixed, default: {} },
}, { timestamps: true });
exports.BillingEvent = mongoose_1.default.model("BillingEvent", BillingEventSchema);
