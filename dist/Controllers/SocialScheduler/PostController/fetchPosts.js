"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPosts = void 0;
const responseService_1 = require("../../../Services/responseService");
const SocialModels_1 = require("../../../Models/SocialModels");
const utils_1 = require("../../../helpers/utils");
exports.fetchPosts = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const orgId = (req.organizationId)?._id;
        const posts = await SocialModels_1.Post.find({ orgId });
        return (0, responseService_1.resSender)(res, 200, "success", "Posts fetched successfully", null, posts);
    }
    catch (error) {
        console.log("Error fetching posts: ", error.message);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Server Error");
    }
});
