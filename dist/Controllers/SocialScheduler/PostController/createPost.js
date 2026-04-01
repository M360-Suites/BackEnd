"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMultiPost = exports.createPost = void 0;
const responseService_1 = require("../../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const types_1 = require("../../../Types/types");
const postService_1 = require("../Posting/postService");
const SocialModels_1 = require("../../../Models/SocialModels");
const utils_1 = require("../../../helpers/utils");
exports.createPost = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const orgId = (req.organizationId)?._id;
        const { platform } = req.params;
        let content = req.body;
        // console.log('Content 1: ', content);
        if (!Object.values(types_1.SocialPlatform).includes(platform))
            return (0, responseService_1.resSender)(res, 400, "fail", "Invalid Platform!");
        const { error } = joi_1.default.object({
            text: joi_1.default.string(),
            // imageUrl: Joi.string().uri(),
            // videoUrl: Joi.string().uri(),
            title: joi_1.default.string(),
            description: joi_1.default.string(),
            scheduledAt: joi_1.default.date(),
        }).validate(content);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        const file = req.file;
        const files = req.files;
        if (file) {
            console.log("File: ", file);
            content = {
                ...content,
                files: [file],
            };
        }
        if (files) {
            // console.log("Files: ", files);
            content = {
                ...content,
                files: files,
            };
        }
        // console.log("Content 2: ", content);
        const result = await (0, postService_1.post)(orgId, platform, content);
        console.log("Result: ", result);
        // For Queuing
        // addPostJob(userId, platform as SocialPlatform, content)
        if (!result.success)
            throw new Error(result.error || "Error occurred while posting!");
        let newPost = new SocialModels_1.Post({
            userId,
            orgId,
            text: content.text,
            description: content.description,
            platforms: [{ platform, postId: result.postId }],
        });
        await newPost.save();
        return (0, responseService_1.resSender)(res, 200, "success", "Post Successful!", null, result);
    }
    catch (error) {
        console.log("Error creating post: ", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error creating Post!");
    }
});
exports.createMultiPost = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const orgId = (req.organizationId)?._id;
        let { platforms, content, } = req.body;
        content = JSON.parse(content);
        // console.log("Request body: ", req.body);
        const { error } = joi_1.default.object({
            text: joi_1.default.string(),
            // imageUrl: Joi.string().uri(),
            // videoUrl: Joi.string().uri(),
            title: joi_1.default.string(),
            description: joi_1.default.string(),
            scheduledAt: joi_1.default.date(),
        }).validate(content);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        if (!platforms || platforms.length < 1)
            return (0, responseService_1.resSender)(res, 400, "fail", "No platforms selected!");
        const file = req.file;
        const files = req.files;
        if (file) {
            console.log("File: ", file);
            content = {
                ...content,
                files: [file],
            };
        }
        if (files) {
            // console.log("Files: ", files);
            content = {
                ...content,
                files: files,
            };
        }
        // console.log('Content: ', content);
        const results = await (0, postService_1.postToMultiplePlatforms)(orgId, platforms, content);
        // For Queuing
        // addBatchPostJobs(userId, platforms, content as PostContent);
        // Log summary
        const successful = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;
        console.log(`Sent ${successful} posts successfully, ${failed} failed`);
        return (0, responseService_1.resSender)(res, 200, "success", `Sent ${successful} posts successfully, ${failed} failed`, null, { logs: results });
    }
    catch (error) {
        console.log("Error creating multiple post: ", error);
        return (0, responseService_1.resSender)(res, 500, "fail", error.message || "Error creating multiple posts");
    }
});
