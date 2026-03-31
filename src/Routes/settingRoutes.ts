import { Router } from "express";
import { authMiddleware } from "../Middlewares/authmiddleware";
import { fetchAllSettings } from "../Controllers/SettingsController/getAllSettings";
import { removeAdsAccount, removeComAccount, removeSocialAccount, saveAds, saveAll, saveCommunity, saveDomain, saveEmail, saveGeneral, saveNotification, saveSecurity } from "../Controllers/SettingsController/saveSettings";
import { editProfile } from "../Controllers/AccountController/GetAccount";
import { CustomRequestHandler } from "../Types/CustomRequest";

const router = Router();

router.use(authMiddleware as CustomRequestHandler);

router.get("/settings", fetchAllSettings as CustomRequestHandler);
router.post("/settings", saveAll as CustomRequestHandler);
router.post("/settings/general", saveGeneral as CustomRequestHandler);
router.post("/settings/profile", editProfile as CustomRequestHandler);
router.post("/settings/notifications", saveNotification as CustomRequestHandler);
router.post("/settings/domain", saveDomain as CustomRequestHandler);
router.post("/settings/email", saveEmail as CustomRequestHandler);
router.post("/settings/ads", saveAds as CustomRequestHandler);
router.post("/settings/community", saveCommunity as CustomRequestHandler);
router.post("/settings/security", saveSecurity as CustomRequestHandler);

router.delete('/security/ads/:accountId', removeAdsAccount as CustomRequestHandler);
router.delete('/security/social/:accountId', removeSocialAccount as CustomRequestHandler);
router.delete('/security/community/:accountId', removeComAccount as CustomRequestHandler);

export default router;
