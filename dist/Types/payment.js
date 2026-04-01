"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BASE_PLAN_AMOUNT = exports.FEATURE_PRICES = exports.BillingStatus = exports.SubscriptionTier = exports.PaymentStatus = exports.SubScriptionInterval = exports.Currency = exports.channels = void 0;
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
exports.channels = [
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
var Currency;
(function (Currency) {
    Currency["NGN"] = "NGN";
    Currency["USD"] = "USD";
    Currency["GHS"] = "GHS";
    Currency["ZAR"] = "ZAR";
    Currency["KES"] = "KES";
    Currency["XOF"] = "XOF";
})(Currency || (exports.Currency = Currency = {}));
var SubScriptionInterval;
(function (SubScriptionInterval) {
    SubScriptionInterval["DAILY"] = "daily";
    SubScriptionInterval["WEEKLY"] = "weekly";
    SubScriptionInterval["MONTHLY"] = "monthly";
    SubScriptionInterval["QUATERLY"] = "quarterly";
    SubScriptionInterval["ANNUALLY"] = "annually";
})(SubScriptionInterval || (exports.SubScriptionInterval = SubScriptionInterval = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["SUCCESS"] = "success";
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["FAILED"] = "failed";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var SubscriptionTier;
(function (SubscriptionTier) {
    SubscriptionTier["FREE"] = "free";
    SubscriptionTier["LAUNCH"] = "launch";
    SubscriptionTier["SCALE"] = "scale";
    SubscriptionTier["ENTERPRISE"] = "enterprise";
})(SubscriptionTier || (exports.SubscriptionTier = SubscriptionTier = {}));
var BillingStatus;
(function (BillingStatus) {
    BillingStatus["TRIAL"] = "trial";
    BillingStatus["ACTIVE"] = "active";
    BillingStatus["PAST_DUE"] = "past_due";
    BillingStatus["CANCELED"] = "canceled";
})(BillingStatus || (exports.BillingStatus = BillingStatus = {}));
exports.FEATURE_PRICES = {
    creative_generator: Number(process.env.CREATIVE_GENERATOR) * 100,
    email_automation: Number(process.env.EMAIL_AUTOMATION) * 100,
    social_scheduler: Number(process.env.SOCIAL_SCHEDULER) * 100,
    community_manager: Number(process.env.COMMUNITY_MANAGER) * 100,
    ads_manager: Number(process.env.ADS_MANAGER) * 100,
    seo_toolkit: Number(process.env.SEO_TOOLKIT) * 100,
};
exports.BASE_PLAN_AMOUNT = Number(process.env.BASE_PLAN_AMOUNT); // minimal Paystack plan
