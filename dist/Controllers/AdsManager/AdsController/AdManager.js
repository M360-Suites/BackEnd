"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdManager = void 0;
class AdManager {
    constructor() {
        this.clients = new Map();
    }
    registerClient(platform, client) {
        this.clients.set(platform, client);
    }
    getClient(platform) {
        const client = this.clients.get(platform);
        if (!client) {
            throw new Error(`No client registered for platform: ${platform}`);
        }
        return client;
    }
    // ============= ACCOUNTS ==============
    async getAdAccounts(platform) {
        return this.getClient(platform).getAdAccounts();
    }
    async getAdAccount(platform, accountId) {
        return this.getClient(platform).getAdAccount(accountId);
    }
    // ============= CAMPAIGNS =============
    async createCampaign(platform, params) {
        return this.getClient(platform).createCampaign(params);
    }
    async getCampaigns(platform, params) {
        return this.getClient(platform).getCampaigns(params);
    }
    async getCampaign(platform, campaignId) {
        return this.getClient(platform).getCampaign(campaignId);
    }
    async updateCampaign(platform, campaignId, params) {
        return this.getClient(platform).updateCampaign(campaignId, params);
    }
    async deleteCampaign(platform, campaignId) {
        return this.getClient(platform).deleteCampaign(campaignId);
    }
    // ============= AD SETS =============
    async createAdSet(platform, params) {
        return this.getClient(platform).createAdSet(params);
    }
    async getAdSets(platform, campaignId, params) {
        return this.getClient(platform).getAdSets(campaignId, params);
    }
    async getAdSet(platform, adSetId) {
        return this.getClient(platform).getAdSet(adSetId);
    }
    async updateAdSet(platform, adSetId, params) {
        return this.getClient(platform).updateAdSet(adSetId, params);
    }
    async deleteAdSet(platform, adSetId) {
        return this.getClient(platform).deleteAdSet(adSetId);
    }
    // ============= ADS =============
    async createAd(platform, params) {
        return this.getClient(platform).createAd(params);
    }
    async getAds(platform, adSetId, params) {
        return this.getClient(platform).getAds(adSetId, params);
    }
    async getAd(platform, adId) {
        return this.getClient(platform).getAd(adId);
    }
    async updateAd(platform, adId, params) {
        return this.getClient(platform).updateAd(adId, params);
    }
    async deleteAd(platform, adId) {
        return this.getClient(platform).deleteAd(adId);
    }
    // ============= CREATIVES =============
    async createAdCreative(platform, params) {
        return this.getClient(platform).createCreative(params);
    }
    async getCreatives(platform, params) {
        return this.getClient(platform).getCreatives(params);
    }
    async getCreative(platform, creativeId) {
        return this.getClient(platform).getCreative(creativeId);
    }
    async updateCreative(platform, creativeId, params) {
        return this.getClient(platform).updateCreative(creativeId, params);
    }
    async deleteCreative(platform, creativeId) {
        return this.getClient(platform).deleteCreative(creativeId);
    }
    // ============= AUDIENCES =============
    async createAudience(platform, params) {
        return this.getClient(platform).createAudience(params);
    }
    async getAudiences(platform, params) {
        return this.getClient(platform).getAudiences(params);
    }
    async getAudience(platform, audienceId) {
        return this.getClient(platform).getAudience(audienceId);
    }
    async updateAudience(platform, audienceId, params) {
        return this.getClient(platform).updateAudience(audienceId, params);
    }
    async deleteAudience(platform, audienceId) {
        return this.getClient(platform).deleteAudience(audienceId);
    }
    // ============= INSIGHTS =============
    async getAccountInsights(platform, params) {
        return this.getClient(platform).getAccountInsights(params);
    }
    async getCampaignInsights(platform, campaignId, params) {
        return this.getClient(platform).getCampaignInsights(campaignId, params);
    }
    async getAdSetInsights(platform, adSetId, params) {
        return this.getClient(platform).getAdSetInsights(adSetId, params);
    }
    async getAdInsights(platform, adId, params) {
        return this.getClient(platform).getAdInsights(adId, params);
    }
    async getInsights(platform, params) {
        return this.getClient(platform).getInsights(params);
    }
    // ============= CROSS-PLATFORM AGGREGATION =============
    async getAggregatedInsights(params) {
        const results = [];
        for (const [platform, client] of this.clients) {
            try {
                const insights = await client.getAccountInsights(params);
                results.push({ platform: platform, insights });
            }
            catch (error) {
                console.error(`Failed to get insights for ${platform}:`, error);
            }
        }
        return results;
    }
    async getAllCampaigns() {
        const results = [];
        for (const [platform, client] of this.clients) {
            try {
                const campaigns = await client.getCampaigns();
                results.push({ platform: platform, campaigns });
            }
            catch (error) {
                console.error(`Failed to get campaigns for ${platform}:`, error);
            }
        }
        return results;
    }
}
exports.AdManager = AdManager;
