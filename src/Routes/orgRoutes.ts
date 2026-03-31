import { Router } from "express";
import { authMiddleware } from "../Middlewares/authmiddleware";
import { CustomRequestHandler } from "../Types/CustomRequest";
import {
    acceptInvite,
  createOrganizationAccount,
  fetchInvitation,
  inviteUserToAccount,
} from "../Controllers/AccountController/OrganizationController";
import { requireRole } from "../Middlewares/roleMiddleware";

const router = Router();
router.use(authMiddleware as CustomRequestHandler);

router.get("/organization/invite", fetchInvitation as CustomRequestHandler);
router.post("/organization", createOrganizationAccount as CustomRequestHandler);
router.put(
  "/organization",
  requireRole("owner", "admin") as CustomRequestHandler,
  inviteUserToAccount as CustomRequestHandler
);
router.put('/organization/accept', acceptInvite as CustomRequestHandler);

export default router;
