"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishWebsite = void 0;
const responseService_1 = require("../../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
const Website_1 = require("../../../Models/Website");
const utils_1 = require("../../../helpers/utils");
/**
 * Publish a website
 */
exports.publishWebsite = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        const website = await Website_1.Website.findByIdAndUpdate(id, {
            status: "published",
            updatedBy: userId,
            updatedAt: new Date(),
        }, { new: true });
        if (!website) {
            return (0, responseService_1.resSender)(res, 404, "error", "website not found");
        }
        return (0, responseService_1.resSender)(res, 200, "success", "website published successfully", null, website);
    }
    catch (error) {
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Failed to publish website");
    }
});
