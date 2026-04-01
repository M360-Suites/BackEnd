"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const authmiddleware_1 = require("../Middlewares/authmiddleware");
const MediaControllers_1 = require("../Controllers/MediaControllers");
const uploadMiddleware_1 = require("../Middlewares/uploadMiddleware");
const roleMiddleware_1 = require("../Middlewares/roleMiddleware");
const router = express_1.default.Router();
router.use(authmiddleware_1.authMiddleware);
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "temp/");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    },
});
exports.upload = (0, multer_1.default)({ storage });
// Upload media
router.post("/media/", exports.upload.array("files"), (0, roleMiddleware_1.requireRole)("owner", "admin", "editor"), uploadMiddleware_1.uploadMiddleware, MediaControllers_1.uploadMedia);
// Get media by ID
router.get("/media/:id", MediaControllers_1.getMedia);
// List media
router.get("/media/", MediaControllers_1.listMedia);
// Update media metadata
router.put("/media/:id", (0, roleMiddleware_1.requireRole)("owner", "admin", "editor"), MediaControllers_1.updateMedia);
// Delete media
router.delete("/media/:id", (0, roleMiddleware_1.requireRole)('owner', 'admin', 'editor'), MediaControllers_1.deleteMedia);
exports.default = router;
