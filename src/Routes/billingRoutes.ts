// import { createSubscriptionPlan, fetchTransaction, initializeOneTimePayment, initializeSubscription, listPlans, listTransactions, payForFeatures, syncPlans, upgradeBilling, verifyPayment } from "../Controllers/PaymentController/paymentController";
import express, { Response } from "express";
import { listPages } from "../Controllers/WebBuilder/PageControllers/getAllPages";
import { CustomRequest, CustomRequestHandler } from "../Types/CustomRequest";
import { webhookController } from "../Controllers/BillingController/WebhookController";
import { billingService } from "../Services/BillingService";
import { subscriptionGuard } from "../Middlewares/subscriptionMiddleware";
import { billingController } from "../Controllers/BillingController/BillingController";
import { authMiddleware } from "../Middlewares/authmiddleware";
import { requireRole } from "../Middlewares/roleMiddleware";

const router = express.Router();
router.use(authMiddleware as CustomRequestHandler);

// Initialize card capture (returns Paystack payment URL)
router.post(
  "/payment/capture-card",
  requireRole('owner') as CustomRequestHandler,
  billingController.captureCard as CustomRequestHandler,
);

// Complete card capture (called after user completes Paystack payment)
router.post(
  "/payment/capture-card/complete",
  requireRole("owner") as CustomRequestHandler,
  billingController.completeCapture as CustomRequestHandler,
);

// Get billing status
router.get(
  "/payment/status/:organizationId",
  billingController.billingStatus as CustomRequestHandler,
);

// Convert trial to subscription
router.post(
  "/payment/subscribe",
  requireRole("owner") as CustomRequestHandler,
  billingController.subscribe as CustomRequestHandler,
);

// Upgrade features
router.post(
  "/payment/upgrade",
  requireRole("owner") as CustomRequestHandler,
  subscriptionGuard as CustomRequestHandler,
  billingController.upgrade as CustomRequestHandler,
);

// Downgrade features
router.post(
  "/payment/downgrade",
  requireRole("owner") as CustomRequestHandler,
  subscriptionGuard as CustomRequestHandler,
  billingController.downgrade as CustomRequestHandler,
);

// Paystack webhook
router.post(
  "/payment/webhooks/paystack",
  webhookController.handlePaystackWebhook as CustomRequestHandler,
);

// // One-time payments
// router.post("/payment", initializeOneTimePayment as CustomRequestHandler);
// router.post("/upgrade", upgradeBilling as CustomRequestHandler);
// router.post("/payment/feature", payForFeatures as CustomRequestHandler);
// router.get("/payment/verify/:reference", verifyPayment as CustomRequestHandler);

// // Subscription payments
// router.post("/payment/plans", createSubscriptionPlan as CustomRequestHandler);
// router.post(
//   "/payment/subscription",
//   initializeSubscription as CustomRequestHandler
// );

// // Webhook (must be POST and without body parsing middleware)
// router.post(
//   "/payment/webhook/paystack",
//   express.raw({ type: "application/json" }),
//   handlePaystackWebhook as CustomRequestHandler
// );

// //Fetch transactions
// router.get(
//   "/payment/transaction/:id",
//   fetchTransaction as CustomRequestHandler
// );
// router.get("/payment/transaction", listTransactions as CustomRequestHandler);
// router.get("/payment/plans", listPlans as CustomRequestHandler);
// router.get("/payment/plans/sync", syncPlans as CustomRequestHandler);

export default router;
