import express from "express";
import { authMiddleware } from "../Middlewares/authmiddleware";
import { getPage } from "../Controllers/WebBuilder/PageControllers/getPage";
import { createPage } from "../Controllers/WebBuilder/PageControllers/createPage";
import { deletePage } from "../Controllers/WebBuilder/PageControllers/deletePage";
import { listPages } from "../Controllers/WebBuilder/PageControllers/getAllPages";
import { publishPage } from "../Controllers/WebBuilder/PageControllers/publishPage";
import { updatePage } from "../Controllers/WebBuilder/PageControllers/updatePage";
import { CustomRequestHandler } from "../Types/CustomRequest";
import { requireRole } from "../Middlewares/roleMiddleware";

const router = express.Router();
router.use(authMiddleware as CustomRequestHandler);

// Create a new page
router.post("/page/", requireRole('owner', 'admin') as CustomRequestHandler, createPage as CustomRequestHandler);

// Get a page by ID or slug
router.get("/page/:id", getPage as CustomRequestHandler);

// Update a page
router.put("/page/:id", requireRole('owner', 'admin') as CustomRequestHandler, updatePage as CustomRequestHandler);

// Delete a page
router.delete("/page/:id", requireRole('owner', 'admin') as CustomRequestHandler, deletePage as CustomRequestHandler);

// List all pages with pagination
router.get("/:websiteId/pages/", listPages as CustomRequestHandler);

// Publish a page
router.post("/page/:id/publish", requireRole('owner', 'admin') as CustomRequestHandler, publishPage as CustomRequestHandler);

export default router;
