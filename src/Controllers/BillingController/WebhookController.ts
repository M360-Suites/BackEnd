import { Request, Response } from "express";
import { CustomRequest } from "../../Types/CustomRequest";
import { Organization } from "../../Models/User";
import { BillingStatus } from "../../Types/payment";
import { BillingEvent } from "../../Models/Subscriptions";
import { billingService } from "../../Services/BillingService";
import { paystackService } from "../../Services/PaystackService";
import { resSender } from "../../Services/responseService";

export class WebhookController {
  async handlePaystackWebhook(
    req: CustomRequest,
    res: Response,
  ): Promise<void> {
    // Verify signature
    const signature = req.headers["x-paystack-signature"] as string;
    const payload = JSON.stringify(req.body);

    if (!paystackService.verifyWebhookSignature(payload, signature)) {
      resSender(res, 401, "fail", "Invalid signature");
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

      resSender(res, 200, "success", "Successful");
    } catch (error) {
      console.error("Webhook processing error:", error);
      resSender(res, 500, "error", "Webhook processing failed");
    }
  }

  private async handleChargeSuccess(data: any): Promise<void> {
    const customerCode = data.customer?.customer_code;
    if (!customerCode) return;

    const org = await Organization.findOne({
      paystackCustomerCode: customerCode,
    });
    if (!org) return;

    // Check if this is a card authorization charge (not subscription)
    if (
      data.metadata?.custom_fields?.some(
        (f: any) => f.value === "card_authorization",
      )
    ) {
      // Card was successfully authorized
      await BillingEvent.create({
        organizationId: org._id,
        eventType: "card_authorized",
        paystackReference: data.reference,
        amount: data.amount,
        status: "success",
      });
    }
  }

  private async handleSubscriptionCreate(data: any): Promise<void> {
    const customerCode = data.customer?.customer_code;
    if (!customerCode) return;

    const org = await Organization.findOne({
      paystackCustomerCode: customerCode,
    });
    if (!org) return;

    // Update subscription code if needed
    if (
      data.subscription_code &&
      org.paystackSubscriptionCode !== data.subscription_code
    ) {
      org.paystackSubscriptionCode = data.subscription_code;
      await org.save();
    }

    await BillingEvent.create({
      organizationId: org._id,
      eventType: "subscription_created_webhook",
      paystackReference: data.subscription_code,
      status: "success",
    });
  }

  private async handleInvoicePaymentSuccess(data: any): Promise<void> {
    const customerCode = data.customer?.customer_code;
    if (!customerCode) return;

    const org = await Organization.findOne({
      paystackCustomerCode: customerCode,
    });
    if (!org) return;

    // Mark as active, clear past_due
    org.billingStatus = BillingStatus.ACTIVE;
    org.gracePeriodEndsAt = null;
    await org.save();

    // Check for pending downgrade and apply it
    if (org.pendingPlanChange) {
      await billingService.applyPendingDowngrade(org._id as string);
    }

    await BillingEvent.create({
      organizationId: org._id,
      eventType: "invoice_paid",
      paystackReference: data.reference,
      amount: data.amount,
      status: "success",
    });
  }

  private async handleInvoicePaymentFailed(data: any): Promise<void> {
    const customerCode = data.customer?.customer_code;
    if (!customerCode) return;

    const org = await Organization.findOne({
      paystackCustomerCode: customerCode,
    });
    if (!org) return;

    await billingService.handlePaymentFailure(org._id as string);
  }

  private async handleSubscriptionDisable(data: any): Promise<void> {
    const customerCode = data.customer?.customer_code;
    if (!customerCode) return;

    const org = await Organization.findOne({
      paystackCustomerCode: customerCode,
    });
    if (!org) return;

    // Only mark as canceled if this wasn't a planned upgrade/downgrade
    if (!org.pendingPlanChange) {
      org.billingStatus = BillingStatus.CANCELED;
      org.activeFeatures = ["basic"];
      await org.save();
    }

    await BillingEvent.create({
      organizationId: org._id,
      eventType: "subscription_disabled",
      paystackReference: data.subscription_code,
      status: "success",
    });
  }

  private async handleSubscriptionNotRenew(data: any): Promise<void> {
    // User has opted out of renewal
    const customerCode = data.customer?.customer_code;
    if (!customerCode) return;

    const org = await Organization.findOne({
      paystackCustomerCode: customerCode,
    });
    if (!org) return;

    await BillingEvent.create({
      organizationId: org._id,
      eventType: "subscription_not_renewing",
      paystackReference: data.subscription_code,
      status: "success",
      metadata: { willCancelAt: "end_of_period" },
    });
  }
}

export const webhookController = new WebhookController();
