"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PinterestPoster = void 0;
const axios_1 = __importDefault(require("axios"));
const basePoster_1 = require("./basePoster");
class PinterestPoster extends basePoster_1.BasePoster {
    async post(content) {
        try {
            const accessToken = this.getAccessToken();
            if (!content.imageUrl) {
                return this.createResult(false, undefined, "Pinterest posts require an image");
            }
            // Get user's boards
            const boardsResponse = await axios_1.default.get("https://api.pinterest.com/v5/boards", {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!boardsResponse.data.items.length) {
                return this.createResult(false, undefined, "No Pinterest boards found");
            }
            const boardId = boardsResponse.data.items[0].id;
            const response = await axios_1.default.post("https://api.pinterest.com/v5/pins", {
                board_id: boardId,
                media_source: {
                    source_type: "image_url",
                    url: content.imageUrl,
                },
                description: content.text || content.description || "",
                title: content.title,
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            });
            return this.createResult(true, response.data.id);
        }
        catch (error) {
            return this.createResult(false, undefined, error.response?.data?.message || error.message);
        }
    }
}
exports.PinterestPoster = PinterestPoster;
