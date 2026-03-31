import express from "express";
import { authMiddleware } from "../Middlewares/authmiddleware";
import { createWebsite } from "../Controllers/WebBuilder/WebsiteControllers/createWebsite";
import { getWebsite } from "../Controllers/WebBuilder/WebsiteControllers/getWebsite";
import { updateWebsite } from "../Controllers/WebBuilder/WebsiteControllers/updateWebsite";
import { deleteWebsite } from "../Controllers/WebBuilder/WebsiteControllers/deleteWebsite";
import { getAllWebsites } from "../Controllers/WebBuilder/WebsiteControllers/getAllWebsites";
import { publishWebsite } from "../Controllers/WebBuilder/WebsiteControllers/publishWebsite";
import { requireFeature } from "../Middlewares/subscriptionMiddleware";
import { requireRole } from "../Middlewares/roleMiddleware";
import { CustomRequestHandler } from "../Types/CustomRequest";

const router = express.Router();
router.use(authMiddleware as CustomRequestHandler);

// Create a new website
router.post(
  "/website/",
  requireFeature("maxProjects") as CustomRequestHandler,
  // checkUsage("maxProjects") as CustomRequestHandler,
  requireRole("owner", "admin", "editor") as CustomRequestHandler,
  // trackUsage() as CustomRequestHandler,
  createWebsite as CustomRequestHandler,
);
// Get a website by ID
router.get("/website/:id", getWebsite as CustomRequestHandler);
// List all websites for an organization
router.get("/websites", getAllWebsites as CustomRequestHandler);
// Update a website
router.put(
  "/website/:id",
  requireRole("owner", "admin", "editor") as CustomRequestHandler,
  updateWebsite as CustomRequestHandler,
);
// Publish a website
router.put(
  "/website/:id/publish",
  requireRole("owner", "admin", "editor") as CustomRequestHandler,
  publishWebsite as CustomRequestHandler,
);
// Delete a website
router.delete(
  "/website/:id",
  requireRole("owner", "admin", "editor") as CustomRequestHandler,
  deleteWebsite as CustomRequestHandler,
);

export default router;
