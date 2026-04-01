"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authmiddleware_1 = require("../Middlewares/authmiddleware");
const fetchAllSubscribers_1 = require("../Controllers/EmailAutomation/SubscriberControllers/fetchAllSubscribers");
const removeContacts_1 = require("../Controllers/EmailAutomation/SubscriberControllers/removeContacts");
const addContacts_1 = require("../Controllers/EmailAutomation/SubscriberControllers/addContacts");
const mediaRoutes_1 = require("./mediaRoutes");
const roleMiddleware_1 = require("../Middlewares/roleMiddleware");
const router = express_1.default.Router();
router.use(authmiddleware_1.authMiddleware);
// Fetch all subscribers
router.get("/subscribers", fetchAllSubscribers_1.fetchAllSubscribers);
// Add contacts
router.post("/subscribers", mediaRoutes_1.upload.single("file"), (0, roleMiddleware_1.requireRole)('admin'), addContacts_1.addContacts);
// Remove contacts
router.delete("/subscribers", (0, roleMiddleware_1.requireRole)("admin"), removeContacts_1.removeContacts);
exports.default = router;
