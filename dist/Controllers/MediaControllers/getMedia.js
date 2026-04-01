"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMedia = void 0;
const logger_1 = require("../../logger/logger");
const responseService_1 = require("../../Services/responseService");
const mongoose_1 = require("mongoose");
const Media_1 = __importDefault(require("../../Models/Media"));
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../Services/validationSchema"));
const utils_1 = require("../../helpers/utils");
/**
 * Get media by ID
 */
exports.getMedia = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        if (!(0, mongoose_1.isValidObjectId)(id)) {
            return (0, responseService_1.resSender)(res, 400, "error", "Invalid media ID");
        }
        const media = await Media_1.default.findById(id);
        if (!media) {
            return (0, responseService_1.resSender)(res, 404, "error", "Media not found");
        }
        return (0, responseService_1.resSender)(res, 200, "success", "Media retrieved successfully", null, media);
    }
    catch (error) {
        logger_1.logger.error(`Error fetching media: ${error}`);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Failed to fetch media");
    }
});
