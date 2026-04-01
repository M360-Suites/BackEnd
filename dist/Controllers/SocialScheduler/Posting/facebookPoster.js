"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookPoster = void 0;
const axios_1 = __importDefault(require("axios"));
const basePoster_1 = require("./basePoster");
const mediaService_1 = require("../../../Services/mediaService");
class FacebookPoster extends basePoster_1.BasePoster {
    async post(content) {
        try {
            const accessToken = this.getAccessToken();
            // Get user's pages
            const pagesResponse = await axios_1.default.get(`https://graph.facebook.com/me/accounts?access_token=${accessToken}`);
            if (!pagesResponse.data.data.length) {
                return this.createResult(false, undefined, "No Facebook pages found");
            }
            // console.log("Pages: ", JSON.stringify(pagesResponse.data, null, 2));
            const pageAccessToken = pagesResponse.data.data[0].access_token;
            const pageId = pagesResponse.data.data[0].id;
            // Handle multiple files
            const files = Array.isArray(content.files)
                ? content.files
                : content.file
                    ? [content.file]
                    : [];
            if (files.length === 0 && !content.text) {
                return this.createResult(false, undefined, "No content to post");
            }
            // Upload all media files first
            const mediaUrls = [];
            for (const file of files) {
                const mediaRes = await (0, mediaService_1.uploadFile)(file.path, {
                    folder: "social-media",
                    resource_type: "auto",
                });
                mediaUrls.push(mediaRes.secure_url);
            }
            // Create post based on media type
            let postId;
            if (mediaUrls.length > 0) {
                if (mediaUrls.some((url) => url.includes(".mp4") ||
                    mediaUrls.some((url) => url.includes(".mov")))) {
                    // Video post - Facebook only supports one video per post
                    const videoUrl = mediaUrls.find((url) => url.includes(".mp4") || url.includes(".mov"));
                    const response = await axios_1.default.post(`https://graph.facebook.com/${pageId}/videos`, {
                        access_token: pageAccessToken,
                        file_url: videoUrl,
                        description: content.text,
                        published: true,
                    });
                    postId = response.data.id;
                }
                else {
                    // Image post - can be multiple
                    if (mediaUrls.length > 1) {
                        // Create album for multiple images
                        const albumRes = await axios_1.default.post(`https://graph.facebook.com/${pageId}/albums`, {
                            access_token: pageAccessToken,
                            name: content.text || "New Album",
                            message: content.description || "",
                        });
                        // Add photos to album
                        for (const url of mediaUrls) {
                            await axios_1.default.post(`https://graph.facebook.com/${albumRes.data.id}/photos`, {
                                access_token: pageAccessToken,
                                url: url,
                                published: true,
                            });
                        }
                        postId = albumRes.data.id;
                    }
                    else {
                        // Single image post
                        const response = await axios_1.default.post(`https://graph.facebook.com/${pageId}/photos`, {
                            access_token: pageAccessToken,
                            url: mediaUrls[0],
                            caption: content.text,
                            published: true,
                        });
                        postId = response.data.id;
                    }
                }
            }
            else {
                // Text-only post
                const response = await axios_1.default.post(`https://graph.facebook.com/${pageId}/feed`, {
                    access_token: pageAccessToken,
                    message: content.text,
                });
                postId = response.data.id;
            }
            return this.createResult(true, postId);
        }
        catch (error) {
            return this.createResult(false, undefined, error.response?.data?.error?.message || error.message);
        }
    }
}
exports.FacebookPoster = FacebookPoster;
