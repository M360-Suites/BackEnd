"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startGraceExpiredJob = startGraceExpiredJob;
const node_cron_1 = __importDefault(require("node-cron"));
const payment_1 = require("../Types/payment");
const User_1 = require("../Models/User");
const BillingService_1 = require("../Services/BillingService");
function startGraceExpiredJob() {
    // Run every hour
    node_cron_1.default.schedule("0 * * * *", async () => {
        console.log("Running grace period expiration job...");
        try {
            const now = new Date();
            // Find organizations with expired grace periods
            const expiredGrace = await User_1.Organization.find({
                billingStatus: payment_1.BillingStatus.PAST_DUE,
                gracePeriodEndsAt: { $lt: now },
            });
            console.log(`Found ${expiredGrace.length} expired grace periods`);
            for (const org of expiredGrace) {
                try {
                    await BillingService_1.billingService.handleGraceExpiration(org._id);
                    console.log(`Grace period expired for org: ${org._id}`);
                }
                catch (error) {
                    console.error(`Failed to process grace expiration for org ${org._id}:`, error);
                }
            }
        }
        catch (error) {
            console.error("Grace expiration job failed:", error);
        }
    });
    console.log("Grace period expiration job scheduled");
}
