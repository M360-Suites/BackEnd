"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookController = exports.WebhookController = void 0;
const User_1 = require("../../Models/User");
const payment_1 = require("../../Types/payment");
const Subscriptions_1 = require("../../Models/Subscriptions");
const BillingService_1 = require("../../Services/BillingService");
const PaystackService_1 = require("../../Services/PaystackService");
const responseService_1 = require("../../Services/responseService");
class WebhookController {
    async handlePaystackWebhook(req, res) {
        // Verify signature
        const signature = req.headers["x-paystack-signature"];
        const payload = JSON.stringify(req.body);
        if (!PaystackService_1.paystackService.verifyWebhookSignature(payload, signature)) {
            (0, responseService_1.resSender)(res, 401, "fail", "Invalid signature");
            return;
        }
        const event = req.body;
        const eventType = event.event;
        const data = event.data;
        console.log(`Received webhook: ${eventType}`);
        try {
            switch (eventType) {
                case "charge.success":
                    await this.handleChargeSuccess(data);
                    break;
                case "subscription.create":
                    await this.handleSubscriptionCreate(data);
                    break;
                case "invoice.payment_success":
                    await this.handleInvoicePaymentSuccess(data);
                    break;
                case "invoice.payment_failed":
                    await this.handleInvoicePaymentFailed(data);
                    break;
                case "subscription.disable":
                    await this.handleSubscriptionDisable(data);
                    break;
                case "subscription.not_renew":
                    await this.handleSubscriptionNotRenew(data);
                    break;
                default:
                    console.log(`Unhandled event type: ${eventType}`);
            }
            (0, responseService_1.resSender)(res, 200, "success", "Successful");
        }
        catch (error) {
            console.error("Webhook processing error:", error);
            (0, responseService_1.resSender)(res, 500, "error", "Webhook processing failed");
        }
    }
    async handleChargeSuccess(data) {
        const customerCode = data.customer?.customer_code;
        if (!customerCode)
            return;
        const org = await User_1.Organization.findOne({
            paystackCustomerCode: customerCode,
        });
        if (!org)
            return;
        // Check if this is a card authorization charge (not subscription)
        if (data.metadata?.custom_fields?.some((f) => f.value === "card_authorization")) {
            // Card was successfully authorized
            await Subscriptions_1.BillingEvent.create({
                organizationId: org._id,
                eventType: "card_authorized",
                paystackReference: data.reference,
                amount: data.amount,
                status: "success",
            });
        }
    }
    async handleSubscriptionCreate(data) {
        const customerCode = data.customer?.customer_code;
        if (!customerCode)
            return;
        const org = await User_1.Organization.findOne({
            paystackCustomerCode: customerCode,
        });
        if (!org)
            return;
        // Update subscription code if needed
        if (data.subscription_code &&
            org.paystackSubscriptionCode !== data.subscription_code) {
            org.paystackSubscriptionCode = data.subscription_code;
            await org.save();
        }
        await Subscriptions_1.BillingEvent.create({
            organizationId: org._id,
            eventType: "subscription_created_webhook",
            paystackReference: data.subscription_code,
            status: "success",
        });
    }
    async handleInvoicePaymentSuccess(data) {
        const customerCode = data.customer?.customer_code;
        if (!customerCode)
            return;
        const org = await User_1.Organization.findOne({
            paystackCustomerCode: customerCode,
        });
        if (!org)
            return;
        // Mark as active, clear past_due
        org.billingStatus = payment_1.BillingStatus.ACTIVE;
        org.gracePeriodEndsAt = null;
        await org.save();
        // Check for pending downgrade and apply it
        if (org.pendingPlanChange) {
            await BillingService_1.billingService.applyPendingDowngrade(org._id);
        }
        await Subscriptions_1.BillingEvent.create({
            organizationId: org._id,
            eventType: "invoice_paid",
            paystackReference: data.reference,
            amount: data.amount,
            status: "success",
        });
    }
    async handleInvoicePaymentFailed(data) {
        const customerCode = data.customer?.customer_code;
        if (!customerCode)
            return;
        const org = await User_1.Organization.findOne({
            paystackCustomerCode: customerCode,
        });
        if (!org)
            return;
        await BillingService_1.billingService.handlePaymentFailure(org._id);
    }
    async handleSubscriptionDisable(data) {
        const customerCode = data.customer?.customer_code;
        if (!customerCode)
            return;
        const org = await User_1.Organization.findOne({
            paystackCustomerCode: customerCode,
        });
        if (!org)
            return;
        // Only mark as canceled if this wasn't a planned upgrade/downgrade
        if (!org.pendingPlanChange) {
            org.billingStatus = payment_1.BillingStatus.CANCELED;
            org.activeFeatures = ["basic"];
            await org.save();
        }
        await Subscriptions_1.BillingEvent.create({
            organizationId: org._id,
            eventType: "subscription_disabled",
            paystackReference: data.subscription_code,
            status: "success",
        });
    }
    async handleSubscriptionNotRenew(data) {
        // User has opted out of renewal
        const customerCode = data.customer?.customer_code;
        if (!customerCode)
            return;
        const org = await User_1.Organization.findOne({
            paystackCustomerCode: customerCode,
        });
        if (!org)
            return;
        await Subscriptions_1.BillingEvent.create({
            organizationId: org._id,
            eventType: "subscription_not_renewing",
            paystackReference: data.subscription_code,
            status: "success",
            metadata: { willCancelAt: "end_of_period" },
        });
    }
}
exports.WebhookController = WebhookController;
exports.webhookController = new WebhookController();
