import { Router } from "express";
import { handleAdsCallback, initAdsAuth } from "../Controllers/AdsManager/Auth/authorizeAds";
import { createAds } from "../Controllers/AdsManager/AdsController/createAds";
import { createGoogleCampaign, getGoogleAdsAccounts, getGoogleCampaigns } from "../Controllers/AdsManager/AdsController/getAdsAccounts";
import {adsController} from "../Controllers/AdsManager/AdsController/AdsController";
import { CustomRequestHandler } from "../Types/CustomRequest";
import { requireRole } from "../Middlewares/roleMiddleware";
import { analyticsController } from "../Controllers/AdsManager/AdsController/AdsAnalyticsController";
import { authMiddleware } from "../Middlewares/authmiddleware";

const router = Router();
// router.use(authMiddleware as CustomRequestHandler);

// const adsController = as CustomRequestHandler new adsController(); as CustomRequestHandler
// const analyticsController = as CustomRequestHandler new AdsAnalyticsController(); as CustomRequestHandler

// ============================================
// OAuth Routes
// ============================================
router.get(
  "/ads/oauth/:platform",
  authMiddleware as CustomRequestHandler,
  requireRole("owner", "admin", "editor") as CustomRequestHandler,
  adsController.initiateOAuth as CustomRequestHandler,
);
router.get("/ads/auth/callback", adsController.handleOAuthCallback as CustomRequestHandler as CustomRequestHandler);
router.delete(
  "/ads/oauth/:platform/disconnect",
  authMiddleware as CustomRequestHandler,
  adsController.disconnectPlatform as CustomRequestHandler,
);

// ============================================
// Ad Accounts Routes
// ============================================
router.get(
  "/ads/accounts/:platform",
  authMiddleware as CustomRequestHandler,
  adsController.getAdAccounts as CustomRequestHandler,
);
router.get(
  "/ads/accounts/:platform/:accountId",
  authMiddleware as CustomRequestHandler,
  adsController.getAdAccountDetails as CustomRequestHandler,
);

// ============================================
// Campaigns Routes
// ============================================
router.get(
  "/ads/campaigns/:platform/:accountId",
  authMiddleware as CustomRequestHandler,
  adsController.getCampaigns as CustomRequestHandler,
);
router.get(
  "/ads/campaigns/:platform/:accountId/:campaignId",
  authMiddleware as CustomRequestHandler,
  adsController.getCampaignDetails as CustomRequestHandler,
);
router.post(
  "/ads/campaigns/:platform/:accountId",
  authMiddleware as CustomRequestHandler,
  adsController.createCampaign as CustomRequestHandler,
);
router.put(
  "/ads/campaigns/:platform/:accountId/:campaignId",
  authMiddleware as CustomRequestHandler,
  adsController.updateCampaign as CustomRequestHandler,
);
router.delete(
  "/ads/campaigns/:platform/:accountId/:campaignId",
  authMiddleware as CustomRequestHandler,
  adsController.deleteCampaign as CustomRequestHandler,
);
router.patch(
  "/ads/campaigns/:platform/:accountId/:campaignId/status",
  authMiddleware as CustomRequestHandler,
  adsController.updateCampaignStatus as CustomRequestHandler,
);

// ============================================
// Ad Sets / Ad Groups Routes
// ============================================
router.get(
  "/ads/adsets/:platform/:accountId/:campaignId",
  authMiddleware as CustomRequestHandler,
  adsController.getAdSets as CustomRequestHandler,
);
router.get(
  "/ads/adsets/:platform/:accountId/:campaignId/:adSetId",
  authMiddleware as CustomRequestHandler,
  adsController.getAdSetDetails as CustomRequestHandler,
);
router.post(
  "/ads/adsets/:platform/:accountId/:campaignId",
  authMiddleware as CustomRequestHandler,
  adsController.createAdSet as CustomRequestHandler,
);
router.put(
  "/ads/adsets/:platform/:accountId/:campaignId/:adSetId",
  authMiddleware as CustomRequestHandler,
  adsController.updateAdSet as CustomRequestHandler,
);
router.delete(
  "/ads/adsets/:platform/:accountId/:campaignId/:adSetId",
  authMiddleware as CustomRequestHandler,
  adsController.deleteAdSet as CustomRequestHandler,
);

// ============================================
// Ads Routes
// ============================================
router.get(
  "/ads/:platform/:accountId/:adSetId",
  authMiddleware as CustomRequestHandler,
  adsController.getAds as CustomRequestHandler,
);
router.get(
  "/ads/:platform/:accountId/:adSetId/:adId",
  authMiddleware as CustomRequestHandler,
  adsController.getAdDetails as CustomRequestHandler,
);
router.post(
  "/ads/:platform/:accountId/:adSetId",
  authMiddleware as CustomRequestHandler,
  adsController.createAd as CustomRequestHandler,
);
router.put(
  "/ads/:platform/:accountId/:adSetId/:adId",
  authMiddleware as CustomRequestHandler,
  adsController.updateAd as CustomRequestHandler,
);
router.delete(
  "/ads/:platform/:accountId/:adSetId/:adId",
  authMiddleware as CustomRequestHandler,
  adsController.deleteAd as CustomRequestHandler,
);

// ============================================
// Creative / Media Routes
// ============================================
router.post(
  "/ads/creatives/:platform/:accountId/upload",
  authMiddleware as CustomRequestHandler,
  adsController.uploadCreative as CustomRequestHandler,
);
router.get(
  "/ads/creatives/:platform/:accountId",
  authMiddleware as CustomRequestHandler,
  adsController.getCreatives as CustomRequestHandler,
);
router.delete(
  "/ads/creatives/:platform/:accountId/:creativeId",
  authMiddleware as CustomRequestHandler,
  adsController.deleteCreative as CustomRequestHandler,
);

// ============================================
// Analytics Routes
// ============================================
router.get(
  "/ads/analytics/:platform/:accountId/overview",
  authMiddleware as CustomRequestHandler,
  analyticsController.getAccountOverview as CustomRequestHandler,
);
router.get(
  "/ads/analytics/:platform/:accountId/campaigns",
  authMiddleware as CustomRequestHandler,
  analyticsController.getCampaignInsights as CustomRequestHandler,
);
router.get(
  "/ads/analytics/:platform/:accountId/campaigns/:campaignId",
  authMiddleware as CustomRequestHandler,
  analyticsController.getCampaignDetails as CustomRequestHandler,
);
router.get(
  "/ads/analytics/:platform/:accountId/adsets/:adSetId",
  authMiddleware as CustomRequestHandler,
  analyticsController.getAdSetInsights as CustomRequestHandler,
);
router.get(
  "/ads/analytics/:platform/:accountId/ads/:adId",
  authMiddleware as CustomRequestHandler,
  analyticsController.getAdInsights as CustomRequestHandler,
);
router.get(
  "/ads/analytics/:platform/:accountId/daily",
  authMiddleware as CustomRequestHandler,
  analyticsController.getDailyBreakdown as CustomRequestHandler,
);
router.get(
  "/ads/analytics/:platform/:accountId/demographics",
  authMiddleware as CustomRequestHandler,
  analyticsController.getDemographics as CustomRequestHandler,
);
router.get(
  "/ads/analytics/:platform/:accountId/placements",
  authMiddleware as CustomRequestHandler,
  analyticsController.getPlacementBreakdown as CustomRequestHandler,
);
router.get(
  "/ads/analytics/:platform/:accountId/devices",
  authMiddleware as CustomRequestHandler,
  analyticsController.getDeviceBreakdown as CustomRequestHandler,
);

// ============================================
// Cross-Platform Aggregated Analytics
// ============================================
router.get(
  "/ads/analytics/aggregated/overview",
  authMiddleware as CustomRequestHandler,
  analyticsController.getAggregatedOverview as CustomRequestHandler,
);
router.get(
  "/ads/analytics/aggregated/campaigns",
  authMiddleware as CustomRequestHandler,
  analyticsController.getAggregatedCampaigns as CustomRequestHandler,
);
router.get(
  "/ads/analytics/aggregated/performance",
  authMiddleware as CustomRequestHandler,
  analyticsController.getAggregatedPerformance as CustomRequestHandler,
);

// ============================================
// Audience / Targeting Routes
// ============================================
router.get(
  "/ads/audiences/:platform/:accountId",
  authMiddleware as CustomRequestHandler,
  adsController.getAudiences as CustomRequestHandler,
);
router.post(
  "/ads/audiences/:platform/:accountId",
  authMiddleware as CustomRequestHandler,
  adsController.createAudience as CustomRequestHandler,
);
router.get(
  "/ads/targeting/:platform/options",
  authMiddleware as CustomRequestHandler,
  adsController.getTargetingOptions as CustomRequestHandler,
);

export default router;