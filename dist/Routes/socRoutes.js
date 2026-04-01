"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authorizeSocials_1 = require("../Controllers/SocialScheduler/Auth/authorizeSocials");
const createPost_1 = require("../Controllers/SocialScheduler/PostController/createPost");
const mediaRoutes_1 = require("./mediaRoutes");
const fetchPosts_1 = require("../Controllers/SocialScheduler/PostController/fetchPosts");
const roleMiddleware_1 = require("../Middlewares/roleMiddleware");
const router = express_1.default.Router();
router.get("/socials/auth/:platform", (0, roleMiddleware_1.requireRole)('owner', 'admin'), authorizeSocials_1.initiateAuth);
router.get("/socials/callback", authorizeSocials_1.handleCallback);
router.post("/socials/post/:platform", mediaRoutes_1.upload.array("files"), (0, roleMiddleware_1.requireRole)("owner", "admin"), createPost_1.createPost);
router.post("/socials/broadcast", mediaRoutes_1.upload.array("files"), (0, roleMiddleware_1.requireRole)("owner", "admin"), createPost_1.createMultiPost);
router.get("socials/posts", fetchPosts_1.fetchPosts);
exports.default = router;
