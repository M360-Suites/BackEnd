import express from "express";
import { authMiddleware } from "../Middlewares/authmiddleware";
import { fetchAllSubscribers } from "../Controllers/EmailAutomation/SubscriberControllers/fetchAllSubscribers";
import { removeContacts } from "../Controllers/EmailAutomation/SubscriberControllers/removeContacts";
import { addContacts } from "../Controllers/EmailAutomation/SubscriberControllers/addContacts";
import { upload } from "./mediaRoutes";
import { CustomRequestHandler } from "../Types/CustomRequest";
import { requireRole } from "../Middlewares/roleMiddleware";

const router = express.Router();
router.use(authMiddleware as CustomRequestHandler);

// Fetch all subscribers
router.get("/subscribers", fetchAllSubscribers as CustomRequestHandler);
// Add contacts
router.post(
  "/subscribers",
  upload.single("file"),
  requireRole('admin') as CustomRequestHandler,
  addContacts as CustomRequestHandler
);
// Remove contacts
router.delete(
  "/subscribers",
  requireRole("admin") as CustomRequestHandler,
  removeContacts as CustomRequestHandler
);

export default router;  