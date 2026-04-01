"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdPlatformClient = void 0;
// src/AdPlatformClient.ts
const axios_1 = __importDefault(require("axios"));
class AdPlatformClient {
    constructor(config) {
        this.config = config;
        this.httpClient = axios_1.default.create({
            timeout: 30000,
            headers: {
                "Content-Type": "application/json",
            },
        });
        // Add response interceptor for error handling
        this.httpClient.interceptors.response.use((response) => response, (error) => this.handleApiError(error));
    }
    async makeRequest(method, url, data, config) {
        const response = await this.httpClient.request({
            method,
            url,
            data,
            ...config,
        });
        return response.data;
    }
    handleApiError(error) {
        if (error.response) {
            const { status, data } = error.response;
            const message = data?.error?.message || data?.message || "API request failed";
            throw new Error(`${this.platform} API Error (${status}): ${message}`);
        }
        else if (error.request) {
            throw new Error(`${this.platform} API Error: No response received`);
        }
        else {
            throw new Error(`${this.platform} API Error: ${error.message}`);
        }
    }
    // ============= HELPER METHODS =============
    formatDateForApi(date) {
        if (date instanceof Date) {
            return date.toISOString().split('T')[0];
        }
        return date;
    }
    parseInsightsResponse(data) {
        return {
            date_start: data.date_start || data.start_date || data.dateStart,
            date_stop: data.date_stop || data.end_date || data.dateEnd,
            account_id: data.account_id || data.accountId,
            campaign_id: data.campaign_id || data.campaignId,
            campaign_name: data.campaign_name || data.campaignName,
            adset_id: data.adset_id || data.adgroupId || data.adsetId,
            adset_name: data.adset_name || data.adgroupName || data.adsetName,
            ad_id: data.ad_id || data.adId,
            ad_name: data.ad_name || data.adName,
            impressions: parseInt(data.impressions || data.impression || '0', 10),
            clicks: parseInt(data.clicks || data.click || '0', 10),
            spend: parseFloat(data.spend || data.cost || data.totalSpend || '0'),
            reach: parseInt(data.reach || '0', 10),
            frequency: parseFloat(data.frequency || '0'),
            cpm: parseFloat(data.cpm || data.costPerMille || '0'),
            cpc: parseFloat(data.cpc || data.costPerClick || '0'),
            ctr: parseFloat(data.ctr || data.clickThroughRate || '0'),
            conversions: parseInt(data.conversions || data.conversion || '0', 10),
            actions: data.actions || [],
            video_views: parseInt(data.video_views || data.videoViews || '0', 10),
        };
    }
}
exports.AdPlatformClient = AdPlatformClient;
