"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTrialExpirationJob = startTrialExpirationJob;
const node_cron_1 = __importDefault(require("node-cron"));
const payment_1 = require("../Types/payment");
const User_1 = require("../Models/User");
const BillingService_1 = require("../Services/BillingService");
function startTrialExpirationJob() {
    // Run every hour
    node_cron_1.default.schedule("0 * * * *", async () => {
        console.log("Running trial expiration job...");
        try {
            const now = new Date();
            // Find organizations with expired trials
            const expiredTrials = await User_1.Organization.find({
                billingStatus: payment_1.BillingStatus.TRIAL,
                trialEndsAt: { $lt: now },
            });
            console.log(`Found ${expiredTrials.length} expired trials`);
            for (const org of expiredTrials) {
                try {
                    // Check if they have a saved payment method
                    if (org.paystackAuthorizationCode && org.paystackCustomerCode) {
                        // Auto-convert to paid subscription with their current features
                        await BillingService_1.billingService.convertTrialToSubscription(org._id, org.activeFeatures);
                        console.log(`Converted trial to subscription for org: ${org._id}`);
                    }
                    else {
                        // No payment method - just mark trial as expired
                        // Access will be blocked by middleware
                        console.log(`Trial expired without payment method: ${org._id}`);
                    }
                }
                catch (error) {
                    console.error(`Failed to process trial for org ${org._id}:`, error);
                }
            }
        }
        catch (error) {
            console.error("Trial expiration job failed:", error);
        }
    });
    console.log("Trial expiration job scheduled");
}
