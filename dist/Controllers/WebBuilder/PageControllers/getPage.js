"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPage = void 0;
const responseService_1 = require("../../../Services/responseService");
const mongoose_1 = require("mongoose");
const Website_1 = require("../../../Models/Website");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
const logger_1 = require("../../../logger/logger");
const utils_1 = require("../../../helpers/utils");
/**
 * Get a single page by ID or slug
 */
exports.getPage = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        let page = null;
        if ((0, mongoose_1.isValidObjectId)(id)) {
            page = await Website_1.Page.findById(id);
        }
        else {
            return (0, responseService_1.resSender)(res, 400, "error", "Invalid page ID");
        }
        if (!page) {
            return (0, responseService_1.resSender)(res, 404, "error", "Page not found");
        }
        return (0, responseService_1.resSender)(res, 200, "success", "Page fetched successfully", null, page);
    }
    catch (error) {
        logger_1.logger.error("Error fetching page:", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Failed to fetch page");
    }
});
