"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import { createSubscriptionPlan, fetchTransaction, initializeOneTimePayment, initializeSubscription, listPlans, listTransactions, payForFeatures, syncPlans, upgradeBilling, verifyPayment } from "../Controllers/PaymentController/paymentController";
const express_1 = __importDefault(require("express"));
const WebhookController_1 = require("../Controllers/BillingController/WebhookController");
const subscriptionMiddleware_1 = require("../Middlewares/subscriptionMiddleware");
const BillingController_1 = require("../Controllers/BillingController/BillingController");
const authmiddleware_1 = require("../Middlewares/authmiddleware");
const roleMiddleware_1 = require("../Middlewares/roleMiddleware");
const router = express_1.default.Router();
router.use(authmiddleware_1.authMiddleware);
// Initialize card capture (returns Paystack payment URL)
router.post("/payment/capture-card", (0, roleMiddleware_1.requireRole)('owner'), BillingController_1.billingController.captureCard);
// Complete card capture (called after user completes Paystack payment)
router.post("/payment/capture-card/complete", (0, roleMiddleware_1.requireRole)("owner"), BillingController_1.billingController.completeCapture);
// Get billing status
router.get("/payment/status/:organizationId", BillingController_1.billingController.billingStatus);
// Convert trial to subscription
router.post("/payment/subscribe", (0, roleMiddleware_1.requireRole)("owner"), BillingController_1.billingController.subscribe);
// Upgrade features
router.post("/payment/upgrade", (0, roleMiddleware_1.requireRole)("owner"), subscriptionMiddleware_1.subscriptionGuard, BillingController_1.billingController.upgrade);
// Downgrade features
router.post("/payment/downgrade", (0, roleMiddleware_1.requireRole)("owner"), subscriptionMiddleware_1.subscriptionGuard, BillingController_1.billingController.downgrade);
// Paystack webhook
router.post("/payment/webhooks/paystack", WebhookController_1.webhookController.handlePaystackWebhook);
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
exports.default = router;
