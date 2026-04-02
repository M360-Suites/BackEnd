"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPage = void 0;
const logger_1 = require("../../../logger/logger");
const responseService_1 = require("../../../Services/responseService");
const mongoose_1 = require("mongoose");
const Website_1 = require("../../../Models/Website");
const Media_1 = __importDefault(require("../../../Models/Media"));
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
const utils_1 = require("../../../helpers/utils");
/**
 * Create a new page
 */
exports.createPage = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { title, content, status, seo, websiteId, featuredImageId, mediaIds } = req.body;
        const userId = req.user._id;
        const orgId = req.organizationId?._id;
        if (!(0, mongoose_1.isValidObjectId)(websiteId))
            return (0, responseService_1.resSender)(res, 400, 'error', 'Invalid website ID');
        const { error } = joi_1.default.object({
            title: validationSchema_1.default.title,
            content: validationSchema_1.default.text,
            status: joi_1.default.string().valid('draft', 'published'),
            seo: joi_1.default.object().optional(),
            websiteId: validationSchema_1.default.objectId,
            featuredImageId: validationSchema_1.default.objectId.optional(),
            mediaIds: joi_1.default.array().items(validationSchema_1.default.objectId).optional(),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        logger_1.logger.info('Validation Successful');
        // Validate featured image if provided
        if (featuredImageId && !(0, mongoose_1.isValidObjectId)(featuredImageId)) {
            return (0, responseService_1.resSender)(res, 400, 'error', 'Invalid featured image ID');
        }
        // Validate media IDs if provided
        if (mediaIds && Array.isArray(mediaIds)) {
            for (const mediaId of mediaIds) {
                if (!(0, mongoose_1.isValidObjectId)(mediaId)) {
                    return (0, responseService_1.resSender)(res, 400, 'error', `Invalid media ID: ${mediaId}`);
                }
            }
        }
        // Check if website exists
        logger_1.logger.info('Website Id: ', websiteId);
        const website = await Website_1.Website.findById(websiteId);
        if (!website)
            return (0, responseService_1.resSender)(res, 404, 'error', 'Website not found');
        // Check if featured image exists if provided
        if (featuredImageId) {
            const featuredImage = await Media_1.default.findById(featuredImageId);
            if (!featuredImage) {
                return (0, responseService_1.resSender)(res, 404, 'error', 'Featured image not found');
            }
        }
        // Check if all media items exist if provided
        if (mediaIds && mediaIds.length > 0) {
            const mediaItems = await Media_1.default.find({ _id: { $in: mediaIds } });
            if (mediaItems.length !== mediaIds.length) {
                return (0, responseService_1.resSender)(res, 404, 'error', 'One or more media items not found');
            }
        }
        // Generate slug from title
        const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        const newPage = new Website_1.Page({
            websiteId,
            title,
            slug,
            content,
            status: status || 'draft',
            seo: seo || {},
            featuredImage: featuredImageId || undefined,
            media: mediaIds || [],
            org: orgId,
            createdBy: userId,
            updatedBy: userId,
        });
        // Check for duplicate slug
        const existingPage = await Website_1.Page.findOne({
            websiteId,
            slug,
        });
        if (existingPage) {
            return (0, responseService_1.resSender)(res, 409, 'fail', 'Page with this slug already exists');
        }
        // Save the new page
        const savedPage = await newPage.save();
        if (!savedPage)
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Unable to save page');
        website.pages.push(savedPage?._id);
        await website.save();
        // Update media items to mark them as used
        if (featuredImageId) {
            await Media_1.default.findByIdAndUpdate(featuredImageId, { isUsed: true });
        }
        if (mediaIds && mediaIds.length > 0) {
            await Media_1.default.updateMany({ _id: { $in: mediaIds } }, { isUsed: true });
        }
        return (0, responseService_1.resSender)(res, 201, 'success', 'Page created successfully', null, savedPage);
    }
    catch (error) {
        console.error(`Error creating page: ${error}`);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Failed to create page');
    }
});
