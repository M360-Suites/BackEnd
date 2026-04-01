"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authorizewithCred_1 = require("../Controllers/EmailAutomation/Auth/authorizewithCred");
const authmiddleware_1 = require("../Middlewares/authmiddleware");
const createCampaign_1 = require("../Controllers/EmailAutomation/CampaignControllers/createCampaign");
const fetchAllCampaigns_1 = require("../Controllers/EmailAutomation/CampaignControllers/fetchAllCampaigns");
const deleteCampaign_1 = require("../Controllers/EmailAutomation/CampaignControllers/deleteCampaign");
const dashBoard_1 = require("../Controllers/EmailAutomation/CampaignControllers/dashBoard");
const roleMiddleware_1 = require("../Middlewares/roleMiddleware");
const router = express_1.default.Router();
router.use(authmiddleware_1.authMiddleware);
// Create a new campaign
router.post("/campaigns", authmiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('owner', 'admin', 'editor'), createCampaign_1.createCampaign);
// Fetch all campaigns
router.get("/campaigns", authmiddleware_1.authMiddleware, fetchAllCampaigns_1.fetchAllCampaigns);
// Delete campaigns
router.delete("/campaigns", authmiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('owner', 'admin', 'editor'), deleteCampaign_1.deleteCampaigns);
// Fetch dashboard data
router.get("/campaigns/dashboard", authmiddleware_1.authMiddleware, dashBoard_1.getDashboardData);
router.get("/campaigns/auth/:platform", (0, roleMiddleware_1.requireRole)('owner', 'admin', 'editor'), authorizewithCred_1.getAuthUrl);
router.get("/campaigns/callback", authorizewithCred_1.handleCallback);
// --- ZOHO ---
let serverUrl = process.env.NODE_ENV === "development"
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
router.post("/campaigns/custom", authmiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('owner', 'admin', 'editor'), authorizewithCred_1.authWithProvider);
exports.default = router;
