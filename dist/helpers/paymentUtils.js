"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePlans = exports.updateUserSubscriptionStatus = exports.updateUserSubscription = exports.updateTransactionStatus = exports.grantUserAccess = exports.generateReference = exports.verifyWebhookSignature = void 0;
const crypto_1 = __importDefault(require("crypto"));
const Subscriptions_1 = require("../Models/Subscriptions");
const planMapping_1 = require("../config/planMapping");
/**
 * Verifies WebHook signatures...
 * @param body
 * @param signature
 * @returns
 */
const verifyWebhookSignature = (body, signature) => {
    const hash = crypto_1.default
        .createHmac("sha512", process.env.PAYSTACK_TEST_SECRET_KEY)
        .update(JSON.stringify(body))
        .digest("hex");
    return hash === signature;
};
exports.verifyWebhookSignature = verifyWebhookSignature;
const generateReference = (userId) => {
    return `ref_${Date.now()}_${userId}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
};
exports.generateReference = generateReference;
// Database functions (pseudo-code)
const updateTransactionStatus = async (isNew, trxDet) => {
    if (isNew) {
        const { orgId, isSubscription, 
        // plan,
        // plan_code,
        amountPaid, email, status, reference, } = trxDet;
        await Subscriptions_1.PaymentRecord.create({
            orgId,
            isSubscription,
            // plan,
            // plan_code,
            amountPaid,
            email,
            status,
            reference,
        });
    }
    else {
        const trx = await Subscriptions_1.PaymentRecord.findOneAndUpdate({ reference: trxDet.reference }, {
            $set: { status: trxDet.status, features: trxDet.features },
        }, { new: true });
    }
};
exports.updateTransactionStatus = updateTransactionStatus;
const grantUserAccess = async (email, orgId, amount) => {
    // Grant user access based on payment
};
exports.grantUserAccess = grantUserAccess;
const updateUserSubscription = async (email, userId, subscriptionData) => {
    // Update user's subscription in database
};
exports.updateUserSubscription = updateUserSubscription;
const updateUserSubscriptionStatus = async (email, status) => {
    // Update user subscription status in db
};
exports.updateUserSubscriptionStatus = updateUserSubscriptionStatus;
const savePlans = async (plans) => {
    // await SubscriptionPlan.deleteMany({});
    for (const plan of plans) {
        const { name, plan_code, id: plan_id, interval, description, amount, currency, } = plan;
        // Convert amount from kobo to actual amount
        const actualAmount = amount / 100;
        // Determine tier and features
        const tier = planMapping_1.planMappings[plan_code]?.tier || (0, planMapping_1.inferTierFromPlan)(plan);
        const features = (0, planMapping_1.getFeaturesForPlan)(plan);
        // await SubscriptionPlan.create({
        //   name,
        //   plan_code,
        //   plan_id,
        //   description,
        //   amount: actualAmount,
        //   interval,
        //   currency: currency?.toUpperCase() || "NGN",
        //   tier,
        //   features,
        // });
        console.log(`Saved plan: ${name} (${plan_code}) as ${tier} tier`);
    }
    console.log(`Successfully saved ${plans.length} plans to database`);
};
exports.savePlans = savePlans;
