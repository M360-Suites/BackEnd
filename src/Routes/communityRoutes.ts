import { Router } from "express";

import {
  handleComCallback,
  initComAuth,
} from "../Controllers/CommunityManager/Auth/auth";
import { CustomRequestHandler } from "../Types/CustomRequest";
import { requireRole } from "../Middlewares/roleMiddleware";
import { communityController } from "../Controllers/CommunityManager/Controller/CommunityController";
import { authMiddleware } from "../Middlewares/authmiddleware";


const router = Router();
// router.use(authMiddleware as CustomRequestHandler);

// Platform Connection (protected)
router.get(
  "/comm/auth/:platform",
  authMiddleware as CustomRequestHandler,
  requireRole("owner", "admin", "editor") as CustomRequestHandler,
  communityController.connectPlatform as CustomRequestHandler as CustomRequestHandler,
);

// OAuth Callback (public)
router.get("/comm/callback", handleComCallback as CustomRequestHandler);

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

router.get(
  "/comm/platforms",
  authMiddleware as CustomRequestHandler,
  communityController.getConnectedPlatforms as CustomRequestHandler,
);
router.delete(
  "/comm/:connectionId",
  authMiddleware as CustomRequestHandler,
  communityController.disconnectPlatform as CustomRequestHandler,
);

// Communities (protected)
router.get("/comm/communities", authMiddleware as CustomRequestHandler, communityController.getCommunities as CustomRequestHandler);
router.post(
  "/comm/communities/sync",
  authMiddleware as CustomRequestHandler,
  communityController.syncCommunities as CustomRequestHandler,
);
router.get(
  "/comm/communities/:communityId",
  authMiddleware as CustomRequestHandler,
  communityController.getCommunityDetails as CustomRequestHandler,
);
router.get(
  "/comm/communities/:communityId/members",
  authMiddleware as CustomRequestHandler,
  communityController.getCommunityMembers as CustomRequestHandler,
);

// Posts (protected)
router.post("/comm/posts", authMiddleware as CustomRequestHandler, communityController.createPost as CustomRequestHandler);
router.get("/comm/posts", authMiddleware as CustomRequestHandler, communityController.getPosts as CustomRequestHandler);
router.put("/comm/posts/:postId", authMiddleware as CustomRequestHandler, communityController.updatePost as CustomRequestHandler);
router.delete("/comm/posts/:postId", authMiddleware as CustomRequestHandler, communityController.deletePost as CustomRequestHandler);

// WhatsApp-specific (protected)
router.post(
  "/comm/whatsapp/send-message",
  authMiddleware as CustomRequestHandler,
  communityController.sendWhatsAppMessage as CustomRequestHandler,
);
router.get(
  "/comm/whatsapp/:connectionId/profile",
  authMiddleware as CustomRequestHandler,
  communityController.getWhatsAppBusinessProfile as CustomRequestHandler,
);

// WhatsApp Webhooks (public)
router.get("/comm/webhooks/whatsapp", communityController.verifyWhatsAppWebhook as CustomRequestHandler);
router.post("/comm/webhooks/whatsapp", communityController.handleWhatsAppWebhook as CustomRequestHandler);

export default router;