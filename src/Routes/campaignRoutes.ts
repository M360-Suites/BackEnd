import express from "express";
import passport from "passport";
import {
  authWithProvider,
  getAuthUrl,
  // googleConsent,
  handleCallback,
  // microsoftConsent,
  zohoConsent,
} from "../Controllers/EmailAutomation/Auth/authorizewithCred";
import { authMiddleware } from "../Middlewares/authmiddleware";
import { createCampaign } from "../Controllers/EmailAutomation/CampaignControllers/createCampaign";
import { fetchAllCampaigns } from "../Controllers/EmailAutomation/CampaignControllers/fetchAllCampaigns";
import { deleteCampaigns } from "../Controllers/EmailAutomation/CampaignControllers/deleteCampaign";
import { getDashboardData } from "../Controllers/EmailAutomation/CampaignControllers/dashBoard";
import { resSender } from "../Services/responseService";
import { CustomRequestHandler } from "../Types/CustomRequest";
import { requireRole } from "../Middlewares/roleMiddleware";

const router = express.Router();

router.use(authMiddleware as CustomRequestHandler);

// Create a new campaign
router.post(
  "/campaigns",
  authMiddleware as CustomRequestHandler,
   requireRole('owner', 'admin', 'editor') as CustomRequestHandler,
  createCampaign as CustomRequestHandler
);
// Fetch all campaigns
router.get(
  "/campaigns",
  authMiddleware as CustomRequestHandler,
  fetchAllCampaigns as CustomRequestHandler
);
// Delete campaigns
router.delete(
  "/campaigns",
  authMiddleware as CustomRequestHandler,
   requireRole('owner', 'admin', 'editor') as CustomRequestHandler,
  deleteCampaigns as CustomRequestHandler
);

// Fetch dashboard data
router.get(
  "/campaigns/dashboard",
  authMiddleware as CustomRequestHandler,
  getDashboardData as CustomRequestHandler
);

router.get("/campaigns/auth/:platform", requireRole('owner', 'admin', 'editor') as CustomRequestHandler, getAuthUrl as CustomRequestHandler);

router.get("/campaigns/callback", handleCallback as CustomRequestHandler);


// --- ZOHO ---
let serverUrl =
  process.env.NODE_ENV === "development"
    ? process.env.SERVER_URL
    : process.env.PROD_URL;

// router.get("/campaigns/zoho", (req, res) => {
//   const zohoAuthUrl =
//     `https://accounts.zoho.com/oauth/v2/auth?` +
//     `scope=ZohoMail.messages.CREATE,ZohoMail.accounts.READ,ZohoMail.accounts.ALL,aaaserver.profile.READ&` + //,ZohoMail.users.READ&` +
//     `client_id=${process.env.ZOHO_CLIENT_ID}&` +
//     `response_type=code&access_type=offline&prompt=consent&` +
//     `state=${'rand_STate'}` +
//     `redirect_uri=${encodeURIComponent(
//       `${serverUrl}/api/campaigns/zoho/callback`
//     )}`;

//   return resSender(res, 200, "success", "", null, zohoAuthUrl);
// });

// router.get("/campaigns/zoho/callback", zohoConsent);

// -------- CUSTOM -----------
router.post(
  "/campaigns/custom",
  authMiddleware as CustomRequestHandler,
   requireRole('owner', 'admin', 'editor') as CustomRequestHandler,
  authWithProvider as CustomRequestHandler
);

export default router;
