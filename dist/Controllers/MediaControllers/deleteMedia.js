"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMedia = void 0;
const responseService_1 = require("../../Services/responseService");
const mongoose_1 = require("mongoose");
const Media_1 = __importDefault(require("../../Models/Media"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const validationSchema_1 = __importDefault(require("../../Services/validationSchema"));
const joi_1 = __importDefault(require("joi"));
const utils_1 = require("../../helpers/utils");
/**
 * Delete media
 */
exports.deleteMedia = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        if (!(0, mongoose_1.isValidObjectId)(id)) {
            return (0, responseService_1.resSender)(res, 400, 'error', 'Invalid media ID');
        }
        const media = await Media_1.default.findById(id);
        if (!media) {
            return (0, responseService_1.resSender)(res, 404, 'error', 'Media not found');
        }
        // Delete the file from storage
        try {
            if (fs_1.default.existsSync(media.path)) {
                fs_1.default.unlinkSync(media.path);
            }
            if (media.thumbnailUrl) {
                const thumbnailPath = path_1.default.join(__dirname, '../../../public', media.thumbnailUrl);
                if (fs_1.default.existsSync(thumbnailPath)) {
                    fs_1.default.unlinkSync(thumbnailPath);
                }
            }
        }
        catch (fileError) {
            console.error(`Error deleting media file: ${fileError}`);
        }
        await Media_1.default.findByIdAndDelete(id);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Media deleted successfully');
    }
    catch (error) {
        console.error(`Error deleting media: ${error}`);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Failed to delete media');
    }
});
