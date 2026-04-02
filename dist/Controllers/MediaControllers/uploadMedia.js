"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMedia = void 0;
const responseService_1 = require("../../Services/responseService");
const Media_1 = __importDefault(require("../../Models/Media"));
const sharp_1 = __importDefault(require("sharp"));
const validationSchema_1 = __importDefault(require("../../Services/validationSchema"));
const joi_1 = __importDefault(require("joi"));
const mediaService_1 = require("../../Services/mediaService"); // Import Cloudinary upload service
const utils_1 = require("../../helpers/utils");
/**
 * Upload media files
 */
exports.uploadMedia = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const orgId = req.organizationId?._id;
        const { altText, caption } = req.body;
        // Validate request body
        const { error } = joi_1.default.object({
            altText: validationSchema_1.default.text,
            caption: validationSchema_1.default.text,
        }).validate({ altText, caption });
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        if (!req.files) {
            return (0, responseService_1.resSender)(res, 400, 'error', 'No file uploaded');
        }
        let files = Object.values(req.files).flat();
        let medias = [];
        for (const file of files) {
            let retries = 5; //Number of retry attempts
            let completeRetries = 0; //Counter for complete retries
            while (retries > 0) {
                try {
                    // Upload file to Cloudinary
                    let uploadResult;
                    try {
                        uploadResult = await (0, mediaService_1.uploadFile)(file.path, {
                            folder: 'uploads',
                            resource_type: 'auto', // Automatically detect file type
                        });
                    }
                    catch (err) {
                        console.error(`Error uploading file to Cloudinary: ${err}`);
                        return (0, responseService_1.resSender)(res, 500, 'error', 'Failed to upload file to Cloudinary');
                    }
                    // Generate thumbnail for images
                    let thumbnailUrl = undefined;
                    if (file.mimetype.startsWith('image/')) {
                        const thumbnailOptions = {
                            folder: 'uploads/thumbnails',
                            transformation: [{ width: 300, height: 300, crop: 'fit' }],
                        };
                        try {
                            const thumbnailResult = await (0, mediaService_1.uploadFile)(file.path, thumbnailOptions);
                            thumbnailUrl = thumbnailResult.secure_url;
                        }
                        catch (err) {
                            console.error(`Error generating thumbnail: ${err}`);
                            return (0, responseService_1.resSender)(res, 500, 'error', 'Failed to generate thumbnail');
                        }
                    }
                    // Get image dimensions if it's an image
                    let dimensions = {};
                    if (file.mimetype.startsWith('image/')) {
                        const image = (0, sharp_1.default)(file.path);
                        const metadata = await image.metadata();
                        dimensions = {
                            width: metadata.width,
                            height: metadata.height,
                        };
                    }
                    // Create media record
                    const newMedia = new Media_1.default({
                        filename: uploadResult.public_id,
                        originalName: file.originalname,
                        mimeType: file.mimetype,
                        size: file.size,
                        path: uploadResult.secure_url,
                        url: uploadResult.secure_url,
                        thumbnailUrl,
                        altText,
                        caption,
                        createdBy: userId,
                        org: orgId,
                        dimensions,
                        metadata: uploadResult,
                    });
                    const savedMedia = await newMedia.save();
                    let mediaData = {
                        _id: savedMedia._id,
                        url: savedMedia.url,
                    };
                    medias.push(mediaData);
                    break; // Exit the loop if no error
                }
                catch (err) {
                    completeRetries++;
                    retries--;
                    console.error(`Error processing file: ${err}`);
                    if (retries === 0) {
                        throw new Error(`Failed to upload file after ${completeRetries} attempts`);
                    }
                    // Wait for a brief period before retrying
                    await new Promise((resolve) => setTimeout(resolve, 3000));
                }
            }
        }
        return (0, responseService_1.resSender)(res, 201, 'success', 'Media uploaded successfully', null, medias);
    }
    catch (error) {
        console.error(`Error uploading media: ${error}`);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Failed to upload media');
    }
});
