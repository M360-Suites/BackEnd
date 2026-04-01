"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingService = exports.BillingService = void 0;
const Subscriptions_1 = require("../Models/Subscriptions");
const User_1 = require("../Models/User");
const payment_1 = require("../Types/payment");
const encryption_1 = require("./encryption");
const PaystackService_1 = require("./PaystackService");
// import {
//   Organization,
//   IOrganization,
//   BillingStatus,
// } from "../models/Organization";
// import { Plan, IPlan } from "../models/Plan";
// import { BillingEvent } from "../models/BillingEvent";
// import { paystackService } from "./PaystackService";
class BillingService {
    // ============================================
    // STEP 1: SIGNUP + TRIAL + CARD CAPTURE
    // ============================================
    async createOrganizationWithTrial(name, email, createdBy) {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial
        const org = new User_1.Organization({
            name,
            email,
            billingStatus: payment_1.BillingStatus.TRIAL,
            onTrial: true,
            trialEndsAt,
            activeFeatures: ["basic"], // Default trial features
            createdBy,
        });
        await org.save();
        return org;
    }
    async initializeCardCapture(organizationId, features) {
        const org = await User_1.Organization.findById(organizationId);
        if (!org)
            throw new Error("Organization not found");
        org.activeFeatures = features;
        await org.save();
        // Initialize ₦50 transaction for card authorization
        const result = await PaystackService_1.paystackService.initializeTransaction(org.email, 5000);
        // Log the billing event
        await Subscriptions_1.BillingEvent.create({
            organizationId: org._id,
            eventType: "card_authorization_initialized",
            paystackReference: result.reference,
            amount: 5000,
            status: "pending",
        });
        return {
            authorization_url: result.authorization_url,
            reference: result.reference,
        };
    }
    async completeCardCapture(organizationId, reference) {
        const org = await User_1.Organization.findById(organizationId);
        if (!org)
            throw new Error("Organization not found");
        // Verify the transaction with Paystack
        const verification = await PaystackService_1.paystackService.verifyTransaction(reference);
        if (verification.status !== "success") {
            throw new Error("Card authorization failed");
        }
        if (!verification.authorization.reusable) {
            throw new Error("Card cannot be used for recurring payments");
        }
        // Save authorization details
        org.paystackCustomerCode = verification.customer.customer_code;
        org.paystackAuthorizationCode =
            (0, encryption_1.encrypt)(verification.authorization.authorization_code);
        await org.save();
        // Update billing event
        await Subscriptions_1.BillingEvent.findOneAndUpdate({ paystackReference: reference }, { status: "success" });
        // Optionally refund the ₦50 auth charge
        try {
            await PaystackService_1.paystackService.refundTransaction(reference);
        }
        catch (error) {
            console.log("Refund not critical, continuing...");
        }
    }
    // ============================================
    // STEP 2: TRIAL MANAGEMENT
    // ============================================
    async checkTrialStatus(organizationId) {
        const org = await User_1.Organization.findById(organizationId);
        if (!org)
            throw new Error("Organization not found");
        if (org.billingStatus !== payment_1.BillingStatus.TRIAL) {
            return {
                isValid: org.billingStatus === payment_1.BillingStatus.ACTIVE,
                daysRemaining: 0,
                status: org.billingStatus,
            };
        }
        const now = new Date();
        const trialEnd = org.trialEndsAt;
        const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
            isValid: daysRemaining > 0,
            daysRemaining: Math.max(0, daysRemaining),
            status: org.billingStatus,
        };
    }
    // ============================================
    // STEP 3: TRIAL → PAID CONVERSION
    // ============================================
    async convertTrialToSubscription(organizationId, selectedFeatures) {
        const org = await User_1.Organization.findById(organizationId);
        if (!org)
            throw new Error("Organization not found");
        if (!org.paystackAuthorizationCode || !org.paystackCustomerCode) {
            throw new Error("No payment method on file. Please add a card first.");
        }
        // Calculate price based on features
        const amount = this.calculatePriceForFeatures(selectedFeatures);
        console.log('Amount: ', amount);
        // Find or create a Paystack plan with exact amount
        const plan = await this.findOrCreatePlan(amount, selectedFeatures);
        // Create subscription using saved authorization
        const subscription = await PaystackService_1.paystackService.createSubscription(org.paystackCustomerCode, plan.paystackPlanCode, (0, encryption_1.decrypt)(org.paystackAuthorizationCode));
        // Update organization
        org.billingStatus = payment_1.BillingStatus.ACTIVE;
        org.onTrial = false;
        org.trialEndsAt = null;
        org.paystackSubscriptionCode = subscription.subscription_code;
        org.currentPlanCode = plan.planCode;
        org.currentAmount = amount;
        org.activeFeatures = selectedFeatures;
        await org.save();
        // Log event
        await Subscriptions_1.BillingEvent.create({
            organizationId: org._id,
            eventType: "subscription_created",
            paystackReference: subscription.subscription_code,
            amount,
            status: "success",
            metadata: { features: selectedFeatures },
        });
    }
    // ============================================
    // FEATURE UPGRADE (WITH PRORATION)
    // ============================================
    async upgradeFeatures(organizationId, newFeatures) {
        const org = await User_1.Organization.findById(organizationId);
        if (!org)
            throw new Error("Organization not found");
        if (org.billingStatus !== payment_1.BillingStatus.ACTIVE) {
            throw new Error("Can only upgrade active subscriptions");
        }
        const newAmount = this.calculatePriceForFeatures(newFeatures);
        const currentAmount = org.currentAmount;
        if (newAmount <= currentAmount) {
            throw new Error("Use downgrade for reducing features");
        }
        // Calculate proration
        const daysRemaining = this.getDaysRemainingInCycle(org);
        const prorationAmount = this.calculateProration(currentAmount, newAmount, daysRemaining);
        // Step 1: Charge proration immediately
        if (prorationAmount > 0) {
            await PaystackService_1.paystackService.chargeAuthorization(org.email, prorationAmount, (0, encryption_1.decrypt)(org.paystackAuthorizationCode), `proration_${org._id}_${Date.now()}`);
        }
        // Step 2: Get current subscription to disable it
        const currentSubscription = await PaystackService_1.paystackService.getSubscription(org.paystackSubscriptionCode);
        // Step 3: Disable old subscription
        await PaystackService_1.paystackService.disableSubscription(org.paystackSubscriptionCode, currentSubscription.email_token);
        // Step 4: Create new plan with new amount
        const newPlan = await this.findOrCreatePlan(newAmount, newFeatures);
        // Step 5: Create new subscription
        const newSubscription = await PaystackService_1.paystackService.createSubscription(org.paystackCustomerCode, newPlan.paystackPlanCode, (0, encryption_1.decrypt)(org.paystackAuthorizationCode));
        // Step 6: Update organization
        org.paystackSubscriptionCode = newSubscription.subscription_code;
        org.currentPlanCode = newPlan.planCode;
        org.currentAmount = newAmount;
        org.activeFeatures = newFeatures;
        await org.save();
        // Log event
        await Subscriptions_1.BillingEvent.create({
            organizationId: org._id,
            eventType: "subscription_upgraded",
            amount: prorationAmount,
            status: "success",
            metadata: {
                oldAmount: currentAmount,
                newAmount,
                newFeatures,
                prorationAmount,
            },
        });
        return { prorationAmount };
    }
    // ============================================
    // FEATURE DOWNGRADE (NEXT CYCLE)
    // ============================================
    async downgradeFeatures(organizationId, newFeatures) {
        const org = await User_1.Organization.findById(organizationId);
        if (!org)
            throw new Error("Organization not found");
        if (org.billingStatus !== payment_1.BillingStatus.ACTIVE) {
            throw new Error("Can only downgrade active subscriptions");
        }
        const newAmount = this.calculatePriceForFeatures(newFeatures);
        const currentAmount = org.currentAmount;
        if (newAmount >= currentAmount) {
            throw new Error("Use upgrade for adding features");
        }
        // Find or create the new plan
        const newPlan = await this.findOrCreatePlan(newAmount, newFeatures);
        // Save pending change (will be applied on next successful renewal)
        org.pendingPlanChange = {
            planCode: newPlan.planCode,
            amount: newAmount,
            features: newFeatures,
        };
        await org.save();
        // Log event
        await Subscriptions_1.BillingEvent.create({
            organizationId: org._id,
            eventType: "downgrade_scheduled",
            amount: newAmount,
            status: "pending",
            metadata: {
                currentAmount,
                newAmount,
                newFeatures,
                appliesNextCycle: true,
            },
        });
    }
    // Apply pending downgrade (called from webhook on successful renewal)
    async applyPendingDowngrade(organizationId) {
        const org = await User_1.Organization.findById(organizationId);
        if (!org || !org.pendingPlanChange)
            return;
        const pendingChange = org.pendingPlanChange;
        // Get current subscription
        const currentSubscription = await PaystackService_1.paystackService.getSubscription(org.paystackSubscriptionCode);
        // Disable old subscription
        await PaystackService_1.paystackService.disableSubscription(org.paystackSubscriptionCode, currentSubscription.email_token);
        // Get the plan
        const plan = await Subscriptions_1.Plan.findOne({ planCode: pendingChange.planCode });
        if (!plan)
            throw new Error("Pending plan not found");
        // Create new subscription with lower amount
        const newSubscription = await PaystackService_1.paystackService.createSubscription(org.paystackCustomerCode, plan.paystackPlanCode, (0, encryption_1.decrypt)(org.paystackAuthorizationCode));
        // Update organization
        org.paystackSubscriptionCode = newSubscription.subscription_code;
        org.currentPlanCode = pendingChange.planCode;
        org.currentAmount = pendingChange.amount;
        org.activeFeatures = pendingChange.features;
        org.pendingPlanChange = null;
        await org.save();
        await Subscriptions_1.BillingEvent.create({
            organizationId: org._id,
            eventType: "downgrade_applied",
            amount: pendingChange.amount,
            status: "success",
            metadata: { features: pendingChange.features },
        });
    }
    // ============================================
    // GRACE PERIOD HANDLING
    // ============================================
    async handlePaymentFailure(organizationId) {
        const org = await User_1.Organization.findById(organizationId);
        if (!org)
            return;
        const gracePeriodEndsAt = new Date();
        gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + 3); // 3-day grace
        org.billingStatus = payment_1.BillingStatus.PAST_DUE;
        org.gracePeriodEndsAt = gracePeriodEndsAt;
        await org.save();
        await Subscriptions_1.BillingEvent.create({
            organizationId: org._id,
            eventType: "payment_failed",
            status: "failed",
            metadata: { gracePeriodEndsAt },
        });
    }
    async handleGraceExpiration(organizationId) {
        const org = await User_1.Organization.findById(organizationId);
        if (!org)
            return;
        org.billingStatus = payment_1.BillingStatus.CANCELED;
        org.activeFeatures = ["basic"]; // Downgrade to basic
        await org.save();
        await Subscriptions_1.BillingEvent.create({
            organizationId: org._id,
            eventType: "grace_period_expired",
            status: "failed",
            metadata: { action: "access_blocked" },
        });
    }
    // ============================================
    // HELPER METHODS
    // ============================================
    calculatePriceForFeatures(features) {
        const basePrice = 1000000; // ₦10,000 base in kobo
        const featureTotal = features.reduce((sum, feature) => {
            return sum + (payment_1.FEATURE_PRICES[feature] || 0);
        }, 0);
        console.log('Prices: ', { basePrice, featureTotal });
        return basePrice + featureTotal;
    }
    calculateProration(currentAmount, newAmount, daysRemaining) {
        const dailyDifference = (newAmount - currentAmount) / 30;
        return Math.max(0, Math.round(dailyDifference * daysRemaining));
    }
    getDaysRemainingInCycle(org) {
        // Assuming monthly billing, calculate days until next renewal
        // In production, get this from Paystack subscription details
        const today = new Date();
        const dayOfMonth = today.getDate();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        return daysInMonth - dayOfMonth;
    }
    async findOrCreatePlan(amount, features) {
        // Check if plan with exact amount and features exists
        let plan = await Subscriptions_1.Plan.findOne({ amount, features, isActive: true });
        if (!plan) {
            // Create new plan in Paystack
            const planName = `Plan_${amount}_${Date.now()}`;
            const paystackPlan = await PaystackService_1.paystackService.createPlan(planName, amount, "monthly");
            // Save to database
            plan = new Subscriptions_1.Plan({
                planCode: `plan_${amount}_${Date.now()}`,
                name: planName,
                amount,
                features,
                interval: "monthly",
                isActive: true,
                paystackPlanCode: paystackPlan.plan_code,
            });
            await plan.save();
        }
        return plan;
    }
}
exports.BillingService = BillingService;
exports.billingService = new BillingService();
