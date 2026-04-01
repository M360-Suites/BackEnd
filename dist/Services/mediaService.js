"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformFile = exports.fetchFile = exports.uploadFile = void 0;
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
/**
 * Upload a file to Cloudinary
 * @param filePath - The local path to the file to be uploaded
 * @param options - Additional options for the upload (e.g., folder, tags)
 * @returns The upload result from Cloudinary
 */
const uploadFile = async (filePath, options = {}) => {
    try {
        const uploadResult = await cloudinary_1.default.uploader.upload(filePath, options);
        return uploadResult;
    }
    catch (error) {
        console.error("Error uploading file to Cloudinary:", error.message || error);
        throw new Error(error.message || "Failed to upload file to Cloudinary");
    }
};
exports.uploadFile = uploadFile;
/**
 * Fetch an optimized file URL from Cloudinary
 * @param publicId - The public ID of the file in Cloudinary
 * @param options - Options for optimization (e.g., fetch_format, quality)
 * @returns The optimized file URL
 */
const fetchFile = (publicId, options = {}) => {
    try {
        const optimizeUrl = cloudinary_1.default.url(publicId, {
            fetch_format: "auto",
            quality: "auto",
            ...options,
        });
        return optimizeUrl;
    }
    catch (error) {
        console.error("Error fetching file from Cloudinary:", error.message || error);
        throw new Error("Failed to fetch file from Cloudinary");
    }
};
exports.fetchFile = fetchFile;
/**
 * Transform a file in Cloudinary
 * @param publicId - The public ID of the file in Cloudinary
 * @param options - Transformation options (e.g., crop, gravity, width, height)
 * @returns The transformed file URL
 */
const transformFile = (publicId, options = {}) => {
    try {
        const transformedUrl = cloudinary_1.default.url(publicId, options);
        return transformedUrl;
    }
    catch (error) {
        console.error("Error transforming file in Cloudinary:", error.message || error);
        throw new Error("Failed to transform file in Cloudinary");
    }
};
exports.transformFile = transformFile;
