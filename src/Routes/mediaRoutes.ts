import express from "express";
import multer from "multer";
import { authMiddleware } from "../Middlewares/authmiddleware";
import {
  uploadMedia,
  getMedia,
  listMedia,
  updateMedia,
  deleteMedia,
} from "../Controllers/MediaControllers";
import { uploadMiddleware } from "../Middlewares/uploadMiddleware";
import { CustomRequestHandler } from "../Types/CustomRequest";
import { requireRole } from "../Middlewares/roleMiddleware";

const router = express.Router();
router.use(authMiddleware as CustomRequestHandler);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "temp/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

export const upload = multer({ storage });

// Upload media
router.post(
  "/media/",
  upload.array("files"),
  requireRole("owner", "admin", "editor") as CustomRequestHandler,
  uploadMiddleware as CustomRequestHandler,
  uploadMedia as CustomRequestHandler
);

// Get media by ID
router.get("/media/:id", getMedia as CustomRequestHandler);

// List media
router.get("/media/", listMedia as CustomRequestHandler);

// Update media metadata
router.put(
  "/media/:id",
  requireRole("owner", "admin", "editor") as CustomRequestHandler,
  updateMedia as CustomRequestHandler
);

// Delete media
router.delete("/media/:id", requireRole('owner', 'admin', 'editor') as CustomRequestHandler, deleteMedia as CustomRequestHandler);

export default router;