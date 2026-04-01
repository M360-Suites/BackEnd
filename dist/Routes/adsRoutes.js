"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AdsController_1 = require("../Controllers/AdsManager/AdsController/AdsController");
const roleMiddleware_1 = require("../Middlewares/roleMiddleware");
const AdsAnalyticsController_1 = require("../Controllers/AdsManager/AdsController/AdsAnalyticsController");
const authmiddleware_1 = require("../Middlewares/authmiddleware");
const router = (0, express_1.Router)();
// router.use(authMiddleware as CustomRequestHandler);
// const adsController = as CustomRequestHandler new adsController(); as CustomRequestHandler
// const analyticsController = as CustomRequestHandler new AdsAnalyticsController(); as CustomRequestHandler
// ============================================
// OAuth Routes
// ============================================
router.get("/ads/oauth/:platform", authmiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)("owner", "admin", "editor"), AdsController_1.adsController.initiateOAuth);
router.get("/ads/auth/callback", AdsController_1.adsController.handleOAuthCallback);
router.delete("/ads/oauth/:platform/disconnect", authmiddleware_1.authMiddleware, AdsController_1.adsController.disconnectPlatform);
// ============================================
// Ad Accounts Routes
// ============================================
router.get("/ads/accounts/:platform", authmiddleware_1.authMiddleware, AdsController_1.adsController.getAdAccounts);
router.get("/ads/accounts/:platform/:accountId", authmiddleware_1.authMiddleware, AdsController_1.adsController.getAdAccountDetails);
// ============================================
// Campaigns Routes
// ============================================
router.get("/ads/campaigns/:platform/:accountId", authmiddleware_1.authMiddleware, AdsController_1.adsController.getCampaigns);
router.get("/ads/campaigns/:platform/:accountId/:campaignId", authmiddleware_1.authMiddleware, AdsController_1.adsController.getCampaignDetails);
router.post("/ads/campaigns/:platform/:accountId", authmiddleware_1.authMiddleware, AdsController_1.adsController.createCampaign);
router.put("/ads/campaigns/:platform/:accountId/:campaignId", authmiddleware_1.authMiddleware, AdsController_1.adsController.updateCampaign);
router.delete("/ads/campaigns/:platform/:accountId/:campaignId", authmiddleware_1.authMiddleware, AdsController_1.adsController.deleteCampaign);
router.patch("/ads/campaigns/:platform/:accountId/:campaignId/status", authmiddleware_1.authMiddleware, AdsController_1.adsController.updateCampaignStatus);
// ============================================
// Ad Sets / Ad Groups Routes
// ============================================
router.get("/ads/adsets/:platform/:accountId/:campaignId", authmiddleware_1.authMiddleware, AdsController_1.adsController.getAdSets);
router.get("/ads/adsets/:platform/:accountId/:campaignId/:adSetId", authmiddleware_1.authMiddleware, AdsController_1.adsController.getAdSetDetails);
router.post("/ads/adsets/:platform/:accountId/:campaignId", authmiddleware_1.authMiddleware, AdsController_1.adsController.createAdSet);
router.put("/ads/adsets/:platform/:accountId/:campaignId/:adSetId", authmiddleware_1.authMiddleware, AdsController_1.adsController.updateAdSet);
router.delete("/ads/adsets/:platform/:accountId/:campaignId/:adSetId", authmiddleware_1.authMiddleware, AdsController_1.adsController.deleteAdSet);
// ============================================
// Ads Routes
// ============================================
router.get("/ads/:platform/:accountId/:adSetId", authmiddleware_1.authMiddleware, AdsController_1.adsController.getAds);
router.get("/ads/:platform/:accountId/:adSetId/:adId", authmiddleware_1.authMiddleware, AdsController_1.adsController.getAdDetails);
router.post("/ads/:platform/:accountId/:adSetId", authmiddleware_1.authMiddleware, AdsController_1.adsController.createAd);
router.put("/ads/:platform/:accountId/:adSetId/:adId", authmiddleware_1.authMiddleware, AdsController_1.adsController.updateAd);
router.delete("/ads/:platform/:accountId/:adSetId/:adId", authmiddleware_1.authMiddleware, AdsController_1.adsController.deleteAd);
// ============================================
// Creative / Media Routes
// ============================================
router.post("/ads/creatives/:platform/:accountId/upload", authmiddleware_1.authMiddleware, AdsController_1.adsController.uploadCreative);
router.get("/ads/creatives/:platform/:accountId", authmiddleware_1.authMiddleware, AdsController_1.adsController.getCreatives);
router.delete("/ads/creatives/:platform/:accountId/:creativeId", authmiddleware_1.authMiddleware, AdsController_1.adsController.deleteCreative);
// ============================================
// Analytics Routes
// ============================================
router.get("/ads/analytics/:platform/:accountId/overview", authmiddleware_1.authMiddleware, AdsAnalyticsController_1.analyticsController.getAccountOverview);
router.get("/ads/analytics/:platform/:accountId/campaigns", authmiddleware_1.authMiddleware, AdsAnalyticsController_1.analyticsController.getCampaignInsights);
router.get("/ads/analytics/:platform/:accountId/campaigns/:campaignId", authmiddleware_1.authMiddleware, AdsAnalyticsController_1.analyticsController.getCampaignDetails);
router.get("/ads/analytics/:platform/:accountId/adsets/:adSetId", authmiddleware_1.authMiddleware, AdsAnalyticsController_1.analyticsController.getAdSetInsights);
router.get("/ads/analytics/:platform/:accountId/ads/:adId", authmiddleware_1.authMiddleware, AdsAnalyticsController_1.analyticsController.getAdInsights);
router.get("/ads/analytics/:platform/:accountId/daily", authmiddleware_1.authMiddleware, AdsAnalyticsController_1.analyticsController.getDailyBreakdown);
router.get("/ads/analytics/:platform/:accountId/demographics", authmiddleware_1.authMiddleware, AdsAnalyticsController_1.analyticsController.getDemographics);
router.get("/ads/analytics/:platform/:accountId/placements", authmiddleware_1.authMiddleware, AdsAnalyticsController_1.analyticsController.getPlacementBreakdown);
router.get("/ads/analytics/:platform/:accountId/devices", authmiddleware_1.authMiddleware, AdsAnalyticsController_1.analyticsController.getDeviceBreakdown);
// ============================================
// Cross-Platform Aggregated Analytics
// ============================================
router.get("/ads/analytics/aggregated/overview", authmiddleware_1.authMiddleware, AdsAnalyticsController_1.analyticsController.getAggregatedOverview);
router.get("/ads/analytics/aggregated/campaigns", authmiddleware_1.authMiddleware, AdsAnalyticsController_1.analyticsController.getAggregatedCampaigns);
router.get("/ads/analytics/aggregated/performance", authmiddleware_1.authMiddleware, AdsAnalyticsController_1.analyticsController.getAggregatedPerformance);
// ============================================
// Audience / Targeting Routes
// ============================================
router.get("/ads/audiences/:platform/:accountId", authmiddleware_1.authMiddleware, AdsController_1.adsController.getAudiences);
router.post("/ads/audiences/:platform/:accountId", authmiddleware_1.authMiddleware, AdsController_1.adsController.createAudience);
router.get("/ads/targeting/:platform/options", authmiddleware_1.authMiddleware, AdsController_1.adsController.getTargetingOptions);
exports.default = router;
