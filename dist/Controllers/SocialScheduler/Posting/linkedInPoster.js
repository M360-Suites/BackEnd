"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkedInPoster = void 0;
const axios_1 = __importDefault(require("axios"));
const basePoster_1 = require("./basePoster");
const fs_1 = __importDefault(require("fs"));
class LinkedInPoster extends basePoster_1.BasePoster {
    async post(content) {
        try {
            const accessToken = this.getAccessToken();
            const connection = this.getConnection();
            const userId = connection.accountId;
            if (!content.text && !content.files) {
                return this.createResult(false, undefined, "Linkedin posts require at least text or media content");
            }
            const postData = {
                author: `urn:li:person:${userId}`,
                lifecycleState: "PUBLISHED",
                specificContent: {
                    "com.linkedin.ugc.ShareContent": {
                        shareCommentary: {
                            text: content.text || "",
                        },
                        shareMediaCategory: "NONE",
                    },
                },
                visibility: {
                    "com.linkedin.ugc.MemberNetworkVisibility": content.privacyStatus || "PUBLIC",
                },
            };
            // Handle media upload if files are present
            if (content.files && content.files.length > 0) {
                const mediaAssets = await this.uploadMedia(content.files);
                if (mediaAssets.length > 0) {
                    // Determine media category based on first file type
                    const isVideo = mediaAssets[0].mediaType === "video";
                    postData.specificContent["com.linkedin.ugc.ShareContent"].shareMediaCategory = isVideo ? "VIDEO" : "IMAGE";
                    postData.specificContent["com.linkedin.ugc.ShareContent"].media =
                        mediaAssets.map((asset) => ({
                            status: "READY",
                            description: {
                                text: content.description || "",
                            },
                            media: asset.assetUrn,
                            title: {
                                text: content.title || "",
                            },
                        }));
                }
            }
            const response = await axios_1.default.post("https://api.linkedin.com/v2/ugcPosts", postData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
            });
            return this.createResult(true, response.data.id);
        }
        catch (error) {
            console.log("Error creating linkedin post: ", error);
            return this.createResult(false, undefined, error.response?.data?.message || error.message);
        }
    }
    async uploadMedia(files) {
        const accessToken = this.getAccessToken();
        const connection = this.getConnection();
        const userId = connection.accountId;
        const results = [];
        for (const file of files) {
            try {
                // Determine media type
                const isVideo = file.mimetype.startsWith("video/");
                const mediaType = isVideo ? "video" : "image";
                // Step 1: Register upload
                const registerResponse = await axios_1.default.post("https://api.linkedin.com/v2/assets?action=registerUpload", {
                    registerUploadRequest: {
                        recipes: [`urn:li:digitalmediaRecipe:feedshare-${mediaType}`],
                        owner: `urn:li:person:${userId}`,
                        serviceRelationships: [
                            {
                                relationshipType: "OWNER",
                                identifier: "urn:li:userGeneratedContent",
                            },
                        ],
                    },
                }, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                        "X-Restli-Protocol-Version": "2.0.0",
                    },
                });
                const uploadUrl = registerResponse.data.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
                const assetUrn = registerResponse.data.value.asset;
                // Step 2: Upload the file
                let fileData;
                if (file.buffer) {
                    fileData = file.buffer;
                }
                else if (file.path) {
                    fileData = fs_1.default.createReadStream(file.path);
                }
                else {
                    console.error("Unsupported file format for LinkedIn upload");
                    continue;
                }
                await axios_1.default.put(uploadUrl, fileData, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/octet-stream",
                        "X-Restli-Protocol-Version": "2.0.0",
                    },
                });
                results.push({ assetUrn, mediaType });
            }
            catch (error) {
                console.error("Error uploading media to LinkedIn:", error);
                // Continue with next file if one fails
            }
        }
        return results;
    }
}
exports.LinkedInPoster = LinkedInPoster;
