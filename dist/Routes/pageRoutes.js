"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authmiddleware_1 = require("../Middlewares/authmiddleware");
const getPage_1 = require("../Controllers/WebBuilder/PageControllers/getPage");
const createPage_1 = require("../Controllers/WebBuilder/PageControllers/createPage");
const deletePage_1 = require("../Controllers/WebBuilder/PageControllers/deletePage");
const getAllPages_1 = require("../Controllers/WebBuilder/PageControllers/getAllPages");
const publishPage_1 = require("../Controllers/WebBuilder/PageControllers/publishPage");
const updatePage_1 = require("../Controllers/WebBuilder/PageControllers/updatePage");
const roleMiddleware_1 = require("../Middlewares/roleMiddleware");
const router = express_1.default.Router();
router.use(authmiddleware_1.authMiddleware);
// Create a new page
router.post("/page/", (0, roleMiddleware_1.requireRole)('owner', 'admin'), createPage_1.createPage);
// Get a page by ID or slug
router.get("/page/:id", getPage_1.getPage);
// Update a page
router.put("/page/:id", (0, roleMiddleware_1.requireRole)('owner', 'admin'), updatePage_1.updatePage);
// Delete a page
router.delete("/page/:id", (0, roleMiddleware_1.requireRole)('owner', 'admin'), deletePage_1.deletePage);
// List all pages with pagination
router.get("/:websiteId/pages/", getAllPages_1.listPages);
// Publish a page
router.post("/page/:id/publish", (0, roleMiddleware_1.requireRole)('owner', 'admin'), publishPage_1.publishPage);
exports.default = router;
