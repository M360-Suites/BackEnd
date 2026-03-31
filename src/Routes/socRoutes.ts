import express from "express";
import {
  handleCallback,
  initiateAuth,
} from "../Controllers/SocialScheduler/Auth/authorizeSocials";
import {
  createMultiPost,
  createPost,
} from "../Controllers/SocialScheduler/PostController/createPost";
import { upload } from "./mediaRoutes";
import { fetchPosts } from "../Controllers/SocialScheduler/PostController/fetchPosts";
import { CustomRequestHandler } from "../Types/CustomRequest";
import { requireRole } from "../Middlewares/roleMiddleware";

const router = express.Router();

router.get("/socials/auth/:platform", requireRole('owner', 'admin') as CustomRequestHandler, initiateAuth as CustomRequestHandler);
router.get("/socials/callback", handleCallback as CustomRequestHandler);
router.post(
  "/socials/post/:platform",
  upload.array("files"),
  requireRole("owner", "admin") as CustomRequestHandler,
  createPost as CustomRequestHandler
);
router.post(
  "/socials/broadcast",
  upload.array("files"),
  requireRole("owner", "admin") as CustomRequestHandler,
  createMultiPost as CustomRequestHandler
);

router.get("socials/posts", fetchPosts as CustomRequestHandler);

export default router;
