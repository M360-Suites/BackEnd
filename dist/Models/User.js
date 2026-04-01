"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Membership = exports.Organization = exports.User = exports.UserRoles = void 0;
const mongoose_1 = require("mongoose");
const types_1 = require("../Types/types");
const ads_1 = require("../Types/ads");
const payment_1 = require("../Types/payment");
var UserRoles;
(function (UserRoles) {
    UserRoles["OWNER"] = "owner";
    UserRoles["ADMIN"] = "admin";
    UserRoles["EDITOR"] = "editor";
    UserRoles["VIEWER"] = "viewer";
})(UserRoles || (exports.UserRoles = UserRoles = {}));
const organizationSchema = new mongoose_1.Schema({
    name: {
        type: String,
        trim: true,
        required: true,
    },
    email: {
        type: String,
        trim: true,
        unique: true,
        lowercase: true,
        required: true,
    },
    avatar: {
        type: String,
        trim: true,
    },
    // NEW
    billingStatus: {
        type: String,
        enum: Object.values(payment_1.BillingStatus),
        default: payment_1.BillingStatus.TRIAL,
    },
    trialEndsAt: { type: Date, default: null },
    paystackCustomerCode: { type: String, default: null },
    paystackAuthorizationCode: { type: String, default: null },
    paystackSubscriptionCode: { type: String, default: null },
    currentPlanCode: { type: String, default: null },
    currentAmount: { type: Number, default: 0 },
    activeFeatures: [{ type: String }],
    gracePeriodEndsAt: { type: Date, default: null },
    pendingPlanChange: {
        type: {
            planCode: String,
            amount: Number,
            features: [String],
        },
        default: null,
    },
    onTrial: {
        type: Boolean,
        required: true,
        default: false,
    },
    // Trial - OLD
    // subscriptionStatus: {
    //   type: String,
    //   enum: ["trial", "active", "past_due", "suspended"],
    //   default: "trial",
    // },
    // onTrial: {
    //   type: Boolean,
    //   required: true,
    //   default: false,
    // },
    // trialStartsAt: {
    //   type: Date,
    // },
    // trialEndsAt: {
    //   type: Date,
    // },
    // // Paystack
    // paystackAuthorization: String,
    // paystackCustomerCode: String,
    // paystackSubscriptionCode: String,
    // // Feature Billing
    // activeFeatures: { type: [String], default: [] },
    // monthlyAmount: { type: Number, default: 0 },
    // // Billing cycle
    // billingCycleStart: Date,
    // gracePeriodEndsAt: Date,
    websites: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Website",
        },
    ],
    adAndSocials: {
        adsAccounts: [
            {
                platform: { type: String, enum: Object.values(ads_1.AdsPlatform) },
                name: String,
                id: String,
            },
        ],
        socialAccounts: [
            {
                platform: { type: String, enum: Object.values(types_1.SocialPlatform) },
                name: String,
                id: String,
            },
        ],
        preferences: {
            postingTime: String,
            timeZone: String,
        },
    },
    community: {
        connectedAccounts: [
            {
                platform: { type: String, enum: Object.values(types_1.ComPlatform) },
                name: String,
                id: String,
            },
        ],
        preferences: {
            autoSyncPosts: Boolean,
            autoDeleteSpams: Boolean,
            contentModeration: Boolean,
            userApproval: Boolean,
        },
    },
    currency: {
        type: String,
        enum: Object.values(payment_1.Currency),
    },
    emailAutoOnboarding: {
        type: Number,
        default: 0,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
    },
    accessEmails: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            default: [],
        },
    ],
}, { timestamps: true });
const userSchema = new mongoose_1.Schema({
    name: {
        type: String,
        trim: true,
        required: true,
    },
    email: {
        type: String,
        trim: true,
        unique: true,
        lowercase: true,
        required: true,
    },
    phone1: {
        type: String,
    },
    phone2: {
        type: String,
    },
    address: {
        type: String,
    },
    city: {
        type: String,
    },
    country: {
        type: String,
    },
    avatar: {
        type: String,
        trim: true,
    },
    googleId: {
        type: String,
        trim: true,
    },
    zohoUid: {
        type: String,
        trim: true,
    },
    password: {
        type: String,
        trim: true,
        required: true,
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });
const membershipSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    email: String,
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    role: { type: String, enum: Object.values(UserRoles) },
    status: { type: String, enum: ["invited", "active", "deactivated"] },
    invitedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    invitedAt: Date,
    acceptedAt: Date,
});
const User = (0, mongoose_1.model)("User", userSchema);
exports.User = User;
const Organization = (0, mongoose_1.model)("Organization", organizationSchema);
exports.Organization = Organization;
const Membership = (0, mongoose_1.model)("Membership", membershipSchema);
exports.Membership = Membership;
