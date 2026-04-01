"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMedia = void 0;
const logger_1 = require("../../logger/logger");
const responseService_1 = require("../../Services/responseService");
const mongoose_1 = require("mongoose");
const Media_1 = __importDefault(require("../../Models/Media"));
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../Services/validationSchema"));
const utils_1 = require("../../helpers/utils");
/**
 * Update media metadata
 */
exports.updateMedia = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { id } = req.params;
        const { altText, caption, isUsed } = req.body;
        // Validate req params and body
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
            altText: validationSchema_1.default.text,
            caption: validationSchema_1.default.text,
            isUsed: joi_1.default.boolean().optional(),
        }).validate({ id, altText, caption, isUsed });
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        if (!(0, mongoose_1.isValidObjectId)(id)) {
            return (0, responseService_1.resSender)(res, 400, "error", "Invalid media ID");
        }
        const updates = {};
        if (altText !== undefined)
            updates.altText = altText;
        if (caption !== undefined)
            updates.caption = caption;
        if (isUsed !== undefined)
            updates.isUsed = isUsed;
        const updatedMedia = await Media_1.default.findByIdAndUpdate(id, updates, {
            new: true,
        });
        if (!updatedMedia) {
            return (0, responseService_1.resSender)(res, 404, "error", "Media not found");
        }
        return (0, responseService_1.resSender)(res, 200, "success", "Media updated successfully", null, updatedMedia);
    }
    catch (error) {
        logger_1.logger.error(`Error updating media: ${error}`);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Failed to update media");
    }
});
