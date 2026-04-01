"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitterPoster = void 0;
const axios_1 = __importDefault(require("axios"));
const basePoster_1 = require("./basePoster");
const fs = __importStar(require("fs"));
const form_data_1 = __importDefault(require("form-data"));
class TwitterPoster extends basePoster_1.BasePoster {
    /**
     * Posts content to Twitter, supporting text and media
     * @param content PostContent object with text and optional media file paths
     * @returns Promise<PostResult> with success status, post ID, or error
     */
    async post(content) {
        try {
            const accessToken = this.getAccessToken();
            if (!content.text && !content.files) {
                return this.createResult(false, undefined, "Twitter posts require at least text or media content");
            }
            let mediaIds = [];
            if (content.files && content.files.length > 0) {
                mediaIds = await this.uploadMedia(content.files, accessToken);
                if (mediaIds.length === 0) {
                    return this.createResult(false, undefined, "Failed to upload media");
                }
            }
            const payload = {};
            if (content.text) {
                payload.text = content.text.slice(0, 280); // Truncate to 280 characters
            }
            if (mediaIds.length > 0) {
                payload.media = { media_ids: mediaIds };
            }
            const response = await axios_1.default.post("https://api.twitter.com/2/tweets", payload, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            });
            return this.createResult(true, response.data.data.id);
        }
        catch (error) {
            const errorMessage = error.response?.data?.detail ||
                error.response?.data?.errors?.[0]?.message ||
                error.message;
            return this.createResult(false, undefined, `Twitter post failed: ${errorMessage}`);
        }
    }
    /**
     * Uploads media files to Twitter and returns media IDs
     * @param media Array of file paths
     * @param accessToken Bearer token for authentication
     * @returns Promise<string[]> Array of media IDs
     */
    async uploadMedia(media, accessToken) {
        const mediaIds = [];
        for (const file of media) {
            try {
                if (!fs.existsSync(file.path)) {
                    console.error(`Media file not found: ${file.path}`);
                    continue;
                }
                const mediaUploader = new MediaUploader(file.path, accessToken);
                const mediaId = await mediaUploader.upload();
                if (mediaId) {
                    mediaIds.push(mediaId);
                    console.log(`Successfully uploaded media: ${file.path}, media_id: ${mediaId}`);
                }
            }
            catch (error) {
                console.error(`Failed to upload media ${file.path}:`, {
                    error: error.response?.data?.errors?.[0]?.message || error.message,
                });
                console.log("Full error details:", error);
            }
        }
        return mediaIds;
    }
}
exports.TwitterPoster = TwitterPoster;
/**
 * Handles chunked media upload to Twitter
 */
class MediaUploader {
    constructor(filePath, accessToken) {
        this.mediaId = null;
        this.processingInfo = null;
        this.allUploaded = false;
        this.videoFilename = filePath;
        this.totalBytes = fs.statSync(filePath).size;
        this.accessToken = accessToken;
    }
    /**
     * Initializes the media upload
     * @returns Promise<string | null> Media ID or null on failure
     */
    async uploadInit() {
        console.log("INIT");
        const mediaType = this.getMediaType();
        const requestBody = {
            media_type: mediaType,
            total_bytes: this.totalBytes,
            media_category: mediaType.startsWith("video/")
                ? "tweet_video"
                : "tweet_image",
            // Optional fields as per your example
            additional_owners: ["2244994945"], // Replace with actual user IDs if needed
            shared: false,
        };
        // const requestBody = {
        //   additional_owners: ["2244994945"],
        //   media_category: "tweet_video",
        //   media_type: "video/mp4",
        //   shared: false,
        //   total_bytes: 8589934592,
        // };
        try {
            const response = await axios_1.default.post("https://api.x.com/2/media/upload/initialize", JSON.stringify(requestBody), {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    "Content-Type": "application/json",
                },
            });
            console.log("Init res: ", response.data);
            this.mediaId = response.data.data?.id;
            console.log(`Media ID: ${this.mediaId}`);
            return this.mediaId;
        }
        catch (error) {
            console.error("Init failed:", {
                error: error.response?.data || error.message,
                status: error.response?.status,
            });
            return null;
        }
    }
    /**
     * Uploads media in chunks
     * @returns Promise<void>
     */
    async uploadAppend() {
        if (!this.mediaId)
            throw new Error("Media ID not initialized");
        console.log("APPEND");
        const chunkSize = 5 * 1024 * 1024; // 5MB chunks, per Twitter's recommendation
        const file = fs.createReadStream(this.videoFilename, {
            highWaterMark: chunkSize,
        });
        let segmentId = 0;
        let bytesSent = 0;
        for await (const chunk of file) {
            const formData = new form_data_1.default();
            formData.append("segment_index", segmentId.toString());
            formData.append("media", chunk, { filename: this.videoFilename });
            try {
                const response = await axios_1.default.post(`https://api.x.com/2/media/upload/${this.mediaId}/append`, formData, {
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        ...formData.getHeaders(),
                    },
                });
                if (response.status < 200 || response.status > 299) {
                    throw new Error(`Upload append failed with status ${response.status}: ${response.data}`);
                }
                bytesSent += chunk.length;
                segmentId++;
                console.log(`${bytesSent} of ${this.totalBytes} bytes uploaded`);
                if (bytesSent >= this.totalBytes) {
                    console.log('All byte chunks uploaded.....');
                    this.allUploaded = true;
                }
            }
            catch (error) {
                throw new Error(`Append failed: ${error.response?.data || error.message}`);
            }
        }
        console.log("Upload chunks complete.");
    }
    /**
     * Finalizes the media upload
     * @returns Promise<void>
     */
    async uploadFinalize() {
        if (!this.mediaId)
            throw new Error("Media ID not initialized");
        console.log("FINALIZE");
        try {
            const response = await axios_1.default.post(`https://api.x.com/2/media/upload/${this.mediaId}/finalize`, undefined, // No body required
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
            });
            this.processingInfo = response.data.data?.processing_info || null;
            console.log("Finalize response:", response.data);
        }
        catch (error) {
            throw new Error(`Finalize failed: ${error.response?.data || error.message}`);
        }
    }
    /**
     * Checks the media processing status
     * @returns Promise<void>
     */
    async checkStatus() {
        if (!this.mediaId)
            return;
        console.log("STATUS");
        try {
            const response = await axios_1.default.get("https://api.x.com/2/media/upload", {
                headers: { Authorization: `Bearer ${this.accessToken}` },
                params: {
                    command: "STATUS",
                    media_id: this.mediaId,
                },
            });
            console.log("Status response:", response.data); // Debug log
            this.processingInfo = response.data.data?.processing_info || null;
            let state = this.processingInfo?.state;
            console.log(`Media processing status is ${state}`);
            if (state === "succeeded")
                return;
            if (state === "failed")
                throw new Error("Media processing failed");
            const checkAfterSecs = this.processingInfo?.check_after_secs || 5;
            console.log(`Checking after ${checkAfterSecs} seconds`);
            await new Promise((resolve) => setTimeout(resolve, checkAfterSecs * 1000));
            await this.checkStatus();
        }
        catch (error) {
            console.error("Status check failed:", {
                error: JSON.stringify(error.response?.data) || error.message,
                status: error.response?.status,
            });
            if (this.allUploaded) {
                this.processingInfo = {
                    ...this.processingInfo,
                    state: 'succeeded'
                };
            }
            // throw new Error(
            //   `Status check failed: ${
            //     JSON.stringify(error.response?.data) || error.message
            //   }`
            // );
        }
    }
    /**
     * Determines the media type based on file extension
     * @returns string Media type (e.g., video/mp4, image/jpeg)
     */
    getMediaType() {
        const ext = this.videoFilename.split(".").pop()?.toLowerCase();
        const types = {
            mp4: "video/mp4",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            gif: "image/gif",
        };
        return types[ext] || "application/octet-stream";
    }
    /**
     * Executes the full upload process
     * @returns Promise<string | null> Media ID or null on failure
     */
    async upload() {
        try {
            const mediaId = await this.uploadInit();
            if (!mediaId)
                return null;
            await this.uploadAppend();
            await this.uploadFinalize();
            await this.checkStatus();
            return this.mediaId;
        }
        catch (error) {
            console.error("Upload process failed:", error.message);
            return null;
        }
    }
}
