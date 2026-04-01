"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramPoster = void 0;
const axios_1 = __importDefault(require("axios"));
const basePoster_1 = require("./basePoster");
class InstagramPoster extends basePoster_1.BasePoster {
    async post(content) {
        try {
            const accessToken = this.getAccessToken();
            // 1. Get Facebook Pages with error handling
            const accountResponse = await axios_1.default.get(`https://graph.facebook.com/me/accounts?access_token=${accessToken}`);
            if (!accountResponse.data.data ||
                accountResponse.data.data.length === 0) {
                return this.createResult(false, undefined, "No Facebook Pages found for this user. Please ensure you have page admin rights.");
            }
            console.log("Facebook Pages: ", JSON.stringify(accountResponse.data, null, 2));
            const page = accountResponse.data.data[0];
            // 2. Get Instagram Business Account with explicit field selection
            const igAccountResponse = await axios_1.default.get(`https://graph.facebook.com/${page.id}` +
                `?fields=instagram_business_account{id,name,username}` +
                `&access_token=${page.access_token}`);
            console.log("Instagram Business Account: ", JSON.stringify(igAccountResponse.data, null, 2));
            if (!igAccountResponse.data.instagram_business_account) {
                return this.createResult(false, undefined, "No Instagram Business Account connected to this Facebook Page. " +
                    "Please check the connection in Facebook Page Settings.");
            }
            // const igAccountId = igAccountResponse.data.instagram_business_account.id;
            const realIgAccountId = igAccountResponse.data.instagram_business_account.id;
            const igAccountId = igAccountResponse.data.id;
            console.log("Ids: ", { igAccountId, realIgAccountId });
            if (!content.imageUrl) {
                return this.createResult(false, undefined, "Instagram posts require an image");
            }
            // Create media object
            const mediaResponse = await axios_1.default.post(`https://graph.facebook.com/${realIgAccountId}/media`, {
                image_url: content.imageUrl,
                caption: content.text || "",
                access_token: page.access_token,
            });
            // Publish media
            const publishResponse = await axios_1.default.post(`https://graph.facebook.com/${igAccountId}/media_publish`, {
                creation_id: mediaResponse.data.id,
                access_token: page.access_token,
            });
            console.log("Media Response: ", mediaResponse.data);
            console.log("Publish Response: ", publishResponse.data);
            return this.createResult(true, publishResponse.data.id);
        }
        catch (error) {
            return this.createResult(false, undefined, error.response?.data?.error?.message || error.message);
        }
    }
}
exports.InstagramPoster = InstagramPoster;
