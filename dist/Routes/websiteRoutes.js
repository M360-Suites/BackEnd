"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authmiddleware_1 = require("../Middlewares/authmiddleware");
const createWebsite_1 = require("../Controllers/WebBuilder/WebsiteControllers/createWebsite");
const getWebsite_1 = require("../Controllers/WebBuilder/WebsiteControllers/getWebsite");
const updateWebsite_1 = require("../Controllers/WebBuilder/WebsiteControllers/updateWebsite");
const deleteWebsite_1 = require("../Controllers/WebBuilder/WebsiteControllers/deleteWebsite");
const getAllWebsites_1 = require("../Controllers/WebBuilder/WebsiteControllers/getAllWebsites");
const publishWebsite_1 = require("../Controllers/WebBuilder/WebsiteControllers/publishWebsite");
const subscriptionMiddleware_1 = require("../Middlewares/subscriptionMiddleware");
const roleMiddleware_1 = require("../Middlewares/roleMiddleware");
const router = express_1.default.Router();
router.use(authmiddleware_1.authMiddleware);
// Create a new website
router.post("/website/", (0, subscriptionMiddleware_1.requireFeature)("maxProjects"), 
// checkUsage("maxProjects") as CustomRequestHandler,
(0, roleMiddleware_1.requireRole)("owner", "admin", "editor"), 
// trackUsage() as CustomRequestHandler,
createWebsite_1.createWebsite);
// Get a website by ID
router.get("/website/:id", getWebsite_1.getWebsite);
// List all websites for an organization
router.get("/websites", getAllWebsites_1.getAllWebsites);
// Update a website
router.put("/website/:id", (0, roleMiddleware_1.requireRole)("owner", "admin", "editor"), updateWebsite_1.updateWebsite);
// Publish a website
router.put("/website/:id/publish", (0, roleMiddleware_1.requireRole)("owner", "admin", "editor"), publishWebsite_1.publishWebsite);
// Delete a website
router.delete("/website/:id", (0, roleMiddleware_1.requireRole)("owner", "admin", "editor"), deleteWebsite_1.deleteWebsite);
exports.default = router;
