"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMedia = void 0;
const responseService_1 = require("../../Services/responseService");
const Media_1 = __importDefault(require("../../Models/Media"));
const joi_1 = __importDefault(require("joi"));
const utils_1 = require("../../helpers/utils");
/**
 * List all media with pagination
 */
exports.listMedia = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { page = 1, limit = 20, mimeType } = req.query;
        const userId = req.user._id;
        const orgId = req.organizationId?._id;
        const { error } = joi_1.default.object({
            page: joi_1.default.number().integer().min(1).default(1),
            limit: joi_1.default.number().integer().min(1).default(20),
            mimeType: joi_1.default.string().valid('image', 'video', 'audio', 'document').optional(),
        }).validate(req.query);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const query = { org: orgId };
        if (mimeType) {
            if (mimeType === 'image') {
                query.mimeType = { $regex: /^image\// };
            }
            else if (mimeType === 'video') {
                query.mimeType = { $regex: /^video\// };
            }
            else {
                query.mimeType = mimeType;
            }
        }
        const media = await Media_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));
        const total = await Media_1.default.countDocuments(query);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Media list retrieved', null, {
            media,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error(`Error listing media: ${error}`);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Failed to list media');
    }
});
