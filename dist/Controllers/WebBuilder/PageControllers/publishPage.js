"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishPage = void 0;
const Website_1 = require("../../../Models/Website");
const responseService_1 = require("../../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
const utils_1 = require("../../../helpers/utils");
/**
 * Publish a page
 */
exports.publishPage = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const orgId = req.organizationId?._id;
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        const page = await Website_1.Page.findByIdAndUpdate(id, {
            status: "published",
            updatedBy: userId,
            updatedAt: new Date(),
        }, { new: true });
        if (!page) {
            return (0, responseService_1.resSender)(res, 404, "error", "Page not found");
        }
        return (0, responseService_1.resSender)(res, 200, "success", "Page published successfully", null, page);
    }
    catch (error) {
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Failed to publish page");
    }
});
