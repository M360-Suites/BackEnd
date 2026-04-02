"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllWebsites = void 0;
const responseService_1 = require("../../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const mongoose_1 = require("mongoose");
const Website_1 = require("../../../Models/Website");
const utils_1 = require("../../../helpers/utils");
/**
 * List all websites with pagination
 */
exports.getAllWebsites = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const userId = req.user._id;
        const orgId = req.organizationId?._id;
        const { error } = joi_1.default.object({
            page: joi_1.default.number().integer().min(1).default(1),
            limit: joi_1.default.number().integer().min(1).default(10),
            status: joi_1.default.string().valid('draft', 'published', 'archived').optional(),
        }).validate(req.query);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        if (!(0, mongoose_1.isValidObjectId)(userId)) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Invalid user ID');
        }
        let query = { orgId };
        if (status)
            query.status = status;
        const websites = await Website_1.Website.find(query)
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .populate('createdBy', 'name email');
        // .populate("updatedBy", "name email");
        const total = await Website_1.Website.countDocuments(query);
        let data = {
            websites,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        };
        return (0, responseService_1.resSender)(res, 200, 'success', 'Pages fetched successfully', null, data);
    }
    catch (error) {
        console.error('Error fetching pages:', error);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Failed to fetch pages');
    }
});
