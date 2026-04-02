"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPages = void 0;
const responseService_1 = require("../../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const mongoose_1 = require("mongoose");
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
const Website_1 = require("../../../Models/Website");
const utils_1 = require("../../../helpers/utils");
/**
 * List all pages with pagination
 */
exports.listPages = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const { websiteId } = req.params;
        const { error } = joi_1.default.object({
            page: joi_1.default.number().integer().min(1).default(1),
            limit: joi_1.default.number().integer().min(1).default(10),
            status: joi_1.default.string().valid('draft', 'published').optional(),
        }).validate(req.query);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const { error: newError } = joi_1.default.object({
            websiteId: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (!(0, mongoose_1.isValidObjectId)(websiteId)) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Invalid website ID');
        }
        else if (newError) {
            return (0, responseService_1.resSender)(res, 400, 'fail', newError.details[0].message);
        }
        // Check if the user has access to the website
        const userId = req.user._id;
        const website = await Website_1.Website.findById(websiteId);
        if (!website) {
            return (0, responseService_1.resSender)(res, 404, 'fail', 'Website not found');
        }
        else if (String(website.createdBy) !== String(userId)) {
            return (0, responseService_1.resSender)(res, 403, 'fail', 'You do not have access to this website');
        }
        const query = { websiteId };
        if (status)
            query.status = status;
        const pages = await Website_1.Page.find(query)
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');
        const total = await Website_1.Page.countDocuments(query);
        let data = {
            pages,
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
