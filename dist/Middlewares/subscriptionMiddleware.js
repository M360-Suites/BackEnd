"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireFeature = void 0;
exports.subscriptionGuard = subscriptionGuard;
// import { SubscriptionService } from "../Controllers/PaymentController/Services/subService";
// import { UsageService } from "../Controllers/PaymentController/Services/usageService";
const responseService_1 = require("../Services/responseService");
// const subscriptionService = new SubscriptionService();
// const usageService = new UsageService();
const User_1 = require("../Models/User");
const payment_1 = require("../Types/payment");
async function subscriptionGuard(req, res, next) {
    try {
        const organizationId = req.organizationId?._id;
        if (!organizationId) {
            (0, responseService_1.resSender)(res, 403, "fail", "No organization specified");
            return;
        }
        const org = await User_1.Organization.findById(organizationId);
        if (!org) {
            (0, responseService_1.resSender)(res, 404, "fail", "Organization not found!");
            return;
        }
        const now = new Date();
        // Check trial status
        if (org.billingStatus === payment_1.BillingStatus.TRIAL) {
            if (org.trialEndsAt && org.trialEndsAt < now) {
                (0, responseService_1.resSender)(res, 403, "fail", "Trial expired", "Your trial has ended. Please subscribe to continue.");
                return;
            }
        }
        // Check past_due with grace period
        if (org.billingStatus === payment_1.BillingStatus.PAST_DUE) {
            if (org.gracePeriodEndsAt && org.gracePeriodEndsAt < now) {
                (0, responseService_1.resSender)(res, 403, "fail", "Payment required", "Your payment is overdue. Please update your payment method.");
                return;
            }
            // Still in grace period - allow access but warn
            res.setHeader("X-Payment-Warning", "Payment overdue");
        }
        // Check canceled status
        if (org.billingStatus === payment_1.BillingStatus.CANCELED) {
            (0, responseService_1.resSender)(res, 403, "fail", "Subscription canceled", "Your subscription has been canceled. Please resubscribe.");
            return;
        }
        // Attach organization to request
        req.organizationId = org;
        next();
    }
    catch (error) {
        (0, responseService_1.resSender)(res, 500, "error", error.message || "Server error");
    }
}
const requireFeature = (feature) => {
    return async (req, res, next) => {
        const orgId = req.organizationId?._id;
        const org = await User_1.Organization.findById(orgId);
        if (!org) {
            return (0, responseService_1.resSender)(res, 403, "fail", "Organization not found");
        }
        if (!org.activeFeatures.includes(feature)) {
            return (0, responseService_1.resSender)(res, 403, "fail", "Feature not available", `This feature requires the "${feature}" add-on. Please upgrade your plan.`, { requiredFeature: feature });
        }
        next();
    };
};
exports.requireFeature = requireFeature;
// export const checkUsage = (feature: string) => {
//   return async (req: CustomRequest, res: Response, next: NextFunction) => {
//     try {
//       const userId = (req.user as any)._id;
//       const orgId = req.organizationId?._id;
//       const usageCheck = await usageService.checkUsageLimit(
//         orgId as string,
//         feature,
//         subscriptionService
//       );
//       if (!usageCheck.allowed) {
//         return resSender(
//           res,
//           429,
//           "fail",
//           "Usage limit exceeded",
//           `You've reached your ${feature} limit (${usageCheck.current}/${usageCheck.limit})`,
//           {
//             current: usageCheck.current,
//             limit: usageCheck.limit,
//             upgradeUrl: "/billing/upgrade",
//           }
//         );
//       }
//       // Attach usage info to request for tracking after the action
//       (req as any).usageInfo = { feature, orgId };
//       next();
//     } catch (error: any) {
//       console.error("Usage check error:", error);
//       resSender(
//         res,
//         500,
//         "error",
//         error.message || "Failed to check usage limit"
//       );
//     }
//   };
// };
// // Middleware to track usage after successful action
// export const trackUsage = () => {
//   return async (req: CustomRequest, res: Response, next: NextFunction) => {
//     const usageInfo = (req as any).usageInfo;
//     if (usageInfo) {
//       res.on("finish", () => {
//         // console.log('Res: ', res);
//         if (res.statusCode >= 200 && res.statusCode < 300) {
//           // Fire and forget - don't await to avoid blocking response
//           usageService
//             .trackFeatureUsage(usageInfo.orgId, usageInfo.feature, 1)
//             .catch((error: any) => {
//               console.error("Failed to track usage:", error);
//               // Don't throw - we don't want to affect the user's request
//             });
//         }
//       });
//     }
//     next();
//   };
// };
