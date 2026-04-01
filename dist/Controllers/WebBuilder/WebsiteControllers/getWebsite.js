"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebsite = void 0;
const responseService_1 = require("../../../Services/responseService");
const mongoose_1 = require("mongoose");
const Website_1 = require("../../../Models/Website");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
const utils_1 = require("../../../helpers/utils");
/**
 * Get a single website by ID or slug
 */
exports.getWebsite = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        let website = null;
        if ((0, mongoose_1.isValidObjectId)(id)) {
            website = await Website_1.Website.findById(id).populate("pages", "_id title slug status");
        }
        else {
            return (0, responseService_1.resSender)(res, 400, "error", "Invalid website ID");
        }
        if (!website) {
            return (0, responseService_1.resSender)(res, 404, "error", "website not found");
        }
        return (0, responseService_1.resSender)(res, 200, "success", "website fetched successfully", null, website);
    }
    catch (error) {
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Failed to fetch website");
    }
});
