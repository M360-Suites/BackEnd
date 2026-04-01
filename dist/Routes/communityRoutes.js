"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../Controllers/CommunityManager/Auth/auth");
const roleMiddleware_1 = require("../Middlewares/roleMiddleware");
const CommunityController_1 = require("../Controllers/CommunityManager/Controller/CommunityController");
const authmiddleware_1 = require("../Middlewares/authmiddleware");
const router = (0, express_1.Router)();
// router.use(authMiddleware as CustomRequestHandler);
// Platform Connection (protected)
router.get("/comm/auth/:platform", authmiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)("owner", "admin", "editor"), CommunityController_1.communityController.connectPlatform);
// OAuth Callback (public)
router.get("/comm/callback", auth_1.handleComCallback);
// Unified routes with platform as parameter
// router.get(
//   "/comm/accounts/:platform",
//   authMiddleware as CustomRequestHandler,
//   commController.handleAdAccountsRequest
// );
// router.post(
//   "/comm/campaigns/:platform",
//   authMiddleware as CustomRequestHandler,
//   commController.handleCampaignsRequest
// );
// router.post(
//   "/comm/comm/:platform",
//   authMiddleware as CustomRequestHandler,
//   commController.handlecommRequest
// );
router.get("/comm/platforms", authmiddleware_1.authMiddleware, CommunityController_1.communityController.getConnectedPlatforms);
router.delete("/comm/:connectionId", authmiddleware_1.authMiddleware, CommunityController_1.communityController.disconnectPlatform);
// Communities (protected)
router.get("/comm/communities", authmiddleware_1.authMiddleware, CommunityController_1.communityController.getCommunities);
router.post("/comm/communities/sync", authmiddleware_1.authMiddleware, CommunityController_1.communityController.syncCommunities);
router.get("/comm/communities/:communityId", authmiddleware_1.authMiddleware, CommunityController_1.communityController.getCommunityDetails);
router.get("/comm/communities/:communityId/members", authmiddleware_1.authMiddleware, CommunityController_1.communityController.getCommunityMembers);
// Posts (protected)
router.post("/comm/posts", authmiddleware_1.authMiddleware, CommunityController_1.communityController.createPost);
router.get("/comm/posts", authmiddleware_1.authMiddleware, CommunityController_1.communityController.getPosts);
router.put("/comm/posts/:postId", authmiddleware_1.authMiddleware, CommunityController_1.communityController.updatePost);
router.delete("/comm/posts/:postId", authmiddleware_1.authMiddleware, CommunityController_1.communityController.deletePost);
// WhatsApp-specific (protected)
router.post("/comm/whatsapp/send-message", authmiddleware_1.authMiddleware, CommunityController_1.communityController.sendWhatsAppMessage);
router.get("/comm/whatsapp/:connectionId/profile", authmiddleware_1.authMiddleware, CommunityController_1.communityController.getWhatsAppBusinessProfile);
// WhatsApp Webhooks (public)
router.get("/comm/webhooks/whatsapp", CommunityController_1.communityController.verifyWhatsAppWebhook);
router.post("/comm/webhooks/whatsapp", CommunityController_1.communityController.handleWhatsAppWebhook);
exports.default = router;
