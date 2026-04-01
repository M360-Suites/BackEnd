"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitterAdsClient = void 0;
// TwitterAdsClient.ts
const AdPlatformClient_1 = require("./AdPlatformClient");
const ads_1 = require("../../../Types/ads");
const crypto_1 = __importDefault(require("crypto"));
// import TwitterAdsAPI from 'twitter-ads';
class TwitterAdsClient extends AdPlatformClient_1.AdPlatformClient {
    constructor(config) {
        super(config);
        this.platform = ads_1.AdsPlatform.TWITTER;
        this.baseUrl = "https://ads-api.twitter.com/12";
        this.consumerKey = config.consumerKey;
        this.consumerSecret = config.consumerSecret;
        this.accessTokenSecret = config.accessTokenSecret;
    }
    generateOAuthSignature(method, url, params, nonce, timestamp) {
        const oauthParams = {
            oauth_consumer_key: this.consumerKey,
            oauth_nonce: nonce,
            oauth_signature_method: "HMAC-SHA1",
            oauth_timestamp: timestamp,
            oauth_token: this.config.accessToken,
            oauth_version: "1.0",
            ...params,
        };
        const sortedParams = Object.keys(oauthParams)
            .sort()
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key])}`)
            .join("&");
        const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
        const signingKey = `${encodeURIComponent(this.consumerSecret)}&${encodeURIComponent(this.accessTokenSecret)}`;
        return crypto_1.default
            .createHmac("sha1", signingKey)
            .update(baseString)
            .digest("base64");
    }
    getOAuthHeader(method, url, params = {}) {
        const nonce = crypto_1.default.randomBytes(16).toString("hex");
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = this.generateOAuthSignature(method, url, params, nonce, timestamp);
        const oauthParams = {
            oauth_consumer_key: this.consumerKey,
            oauth_nonce: nonce,
            oauth_signature: signature,
            oauth_signature_method: "HMAC-SHA1",
            oauth_timestamp: timestamp,
            oauth_token: this.config.accessToken,
            oauth_version: "1.0",
        };
        const headerString = Object.keys(oauthParams)
            .sort()
            .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
            .join(", ");
        return `OAuth ${headerString}`;
    }
    getUrl(endpoint) {
        return `${this.baseUrl}/${endpoint}`;
    }
    // ============= AD ACCOUNTS =============
    async getAdAccounts() {
        const url = this.getUrl("accounts");
        const response = await this.makeRequest("GET", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("GET", url),
                "Content-Type": "application/json",
            },
        });
        return (response.data || []).map((account) => ({
            id: account.id,
            name: account.name,
            currency: account.currency,
            timezone: account.timezone,
            status: account.approval_status,
            platform: this.platform,
            businessId: account.business_id,
        }));
    }
    async getAdAccount(accountId) {
        const url = this.getUrl(`accounts/${accountId}`);
        const response = await this.makeRequest("GET", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("GET", url),
                "Content-Type": "application/json",
            },
        });
        const account = response.data;
        return {
            id: account.id,
            name: account.name,
            currency: account.currency,
            timezone: account.timezone,
            status: account.approval_status,
            platform: this.platform,
        };
    }
    // ============= CAMPAIGNS =============
    async getCampaigns(params) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/campaigns`);
        const queryParams = {
            count: (params?.limit || 100).toString(),
        };
        if (params?.status) {
            queryParams.entity_status = params.status;
        }
        const response = await this.makeRequest("GET", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("GET", url, queryParams),
                "Content-Type": "application/json",
            },
            params: queryParams,
        });
        return (response.data || []).map((campaign) => ({
            id: campaign.id,
            name: campaign.name,
            objective: campaign.objective,
            status: campaign.entity_status,
            daily_budget: campaign.daily_budget_amount_local_micro
                ? campaign.daily_budget_amount_local_micro / 1000000
                : undefined,
            start_time: campaign.start_time,
            end_time: campaign.end_time,
        }));
    }
    async getCampaign(campaignId) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/campaigns/${campaignId}`);
        const response = await this.makeRequest("GET", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("GET", url),
                "Content-Type": "application/json",
            },
        });
        const campaign = response.data;
        return {
            id: campaign.id,
            name: campaign.name,
            objective: campaign.objective,
            status: campaign.entity_status,
            daily_budget: campaign.daily_budget_amount_local_micro
                ? campaign.daily_budget_amount_local_micro / 1000000
                : undefined,
            start_time: campaign.start_time,
            end_time: campaign.end_time,
        };
    }
    async createCampaign(params) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/campaigns`);
        const body = {
            name: params.name,
            objective: this.mapObjective(params.objective),
            entity_status: params.status || "PAUSED",
            funding_instrument_id: this.config
                .fundingInstrumentId,
            ...(params.daily_budget && {
                daily_budget_amount_local_micro: Math.round(params.daily_budget * 1000000),
            }),
            ...(params.start_time && {
                start_time: this.formatDateForApi(params.start_time),
            }),
            ...(params.end_time && {
                end_time: this.formatDateForApi(params.end_time),
            }),
        };
        const response = await this.makeRequest("POST", url, body, {
            headers: {
                Authorization: this.getOAuthHeader("POST", url),
                "Content-Type": "application/json",
            },
        });
        return { id: response.data.id, ...params };
    }
    async updateCampaign(campaignId, params) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/campaigns/${campaignId}`);
        const body = {};
        if (params.name)
            body.name = params.name;
        if (params.status)
            body.entity_status = params.status;
        if (params.daily_budget)
            body.daily_budget_amount_local_micro = Math.round(params.daily_budget * 1000000);
        if (params.end_time)
            body.end_time = this.formatDateForApi(params.end_time);
        await this.makeRequest("PUT", url, body, {
            headers: {
                Authorization: this.getOAuthHeader("PUT", url),
                "Content-Type": "application/json",
            },
        });
        return this.getCampaign(campaignId);
    }
    async deleteCampaign(campaignId) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/campaigns/${campaignId}`);
        await this.makeRequest("DELETE", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("DELETE", url),
                "Content-Type": "application/json",
            },
        });
        return { success: true };
    }
    mapObjective(objective) {
        const mapping = {
            AWARENESS: "AWARENESS",
            TRAFFIC: "WEBSITE_CLICKS",
            ENGAGEMENT: "ENGAGEMENTS",
            LEADS: "WEBSITE_CONVERSIONS",
            APP_PROMOTION: "APP_INSTALLS",
            VIDEO_VIEWS: "VIDEO_VIEWS",
            REACH: "REACH",
        };
        return mapping[objective] || "AWARENESS";
    }
    // ============= LINE ITEMS (Ad Sets) =============
    async getAdSets(campaignId, params) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/line_items`);
        const queryParams = {
            count: (params?.limit || 100).toString(),
        };
        if (campaignId)
            queryParams.campaign_ids = campaignId;
        if (params?.status)
            queryParams.entity_status = params.status;
        const response = await this.makeRequest("GET", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("GET", url, queryParams),
                "Content-Type": "application/json",
            },
            params: queryParams,
        });
        return (response.data || []).map((lineItem) => ({
            id: lineItem.id,
            name: lineItem.name,
            campaign_id: lineItem.campaign_id,
            status: lineItem.entity_status,
            daily_budget: lineItem.bid_amount_local_micro
                ? lineItem.bid_amount_local_micro / 1000000
                : undefined,
            start_time: lineItem.start_time,
            end_time: lineItem.end_time,
            optimization_goal: lineItem.objective,
            bid_amount: lineItem.bid_amount_local_micro
                ? lineItem.bid_amount_local_micro / 1000000
                : undefined,
        }));
    }
    async getAdSet(adSetId) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/line_items/${adSetId}`);
        const response = await this.makeRequest("GET", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("GET", url),
                "Content-Type": "application/json",
            },
        });
        const lineItem = response.data;
        return {
            id: lineItem.id,
            name: lineItem.name,
            campaign_id: lineItem.campaign_id,
            status: lineItem.entity_status,
            bid_amount: lineItem.bid_amount_local_micro
                ? lineItem.bid_amount_local_micro / 1000000
                : undefined,
            start_time: lineItem.start_time,
            end_time: lineItem.end_time,
        };
    }
    async createAdSet(params) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/line_items`);
        const body = {
            name: params.name,
            campaign_id: params.campaign_id,
            entity_status: params.status || "PAUSED",
            product_type: "PROMOTED_TWEETS",
            placements: ["ALL_ON_TWITTER"],
            objective: params.optimization_goal || "TWEET_ENGAGEMENTS",
            ...(params.bid_amount && {
                bid_amount_local_micro: Math.round(params.bid_amount * 1000000),
            }),
            ...(params.start_time && {
                start_time: this.formatDateForApi(params.start_time),
            }),
            ...(params.end_time && {
                end_time: this.formatDateForApi(params.end_time),
            }),
        };
        const response = await this.makeRequest("POST", url, body, {
            headers: {
                Authorization: this.getOAuthHeader("POST", url),
                "Content-Type": "application/json",
            },
        });
        return { id: response.data.id, ...params };
    }
    async updateAdSet(adSetId, params) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/line_items/${adSetId}`);
        const body = {};
        if (params.name)
            body.name = params.name;
        if (params.status)
            body.entity_status = params.status;
        if (params.bid_amount)
            body.bid_amount_local_micro = Math.round(params.bid_amount * 1000000);
        if (params.end_time)
            body.end_time = this.formatDateForApi(params.end_time);
        await this.makeRequest("PUT", url, body, {
            headers: {
                Authorization: this.getOAuthHeader("PUT", url),
                "Content-Type": "application/json",
            },
        });
        return this.getAdSet(adSetId);
    }
    async deleteAdSet(adSetId) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/line_items/${adSetId}`);
        await this.makeRequest("DELETE", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("DELETE", url),
                "Content-Type": "application/json",
            },
        });
        return { success: true };
    }
    // ============= PROMOTED TWEETS (Ads) =============
    async getAds(adSetId, params) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/promoted_tweets`);
        const queryParams = {
            count: (params?.limit || 100).toString(),
        };
        if (adSetId)
            queryParams.line_item_ids = adSetId;
        const response = await this.makeRequest("GET", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("GET", url, queryParams),
                "Content-Type": "application/json",
            },
            params: queryParams,
        });
        return (response.data || []).map((promotedTweet) => ({
            id: promotedTweet.id,
            name: promotedTweet.tweet_id,
            adset_id: promotedTweet.line_item_id,
            status: promotedTweet.entity_status,
            creative_id: promotedTweet.tweet_id,
        }));
    }
    async getAd(adId) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/promoted_tweets/${adId}`);
        const response = await this.makeRequest("GET", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("GET", url),
                "Content-Type": "application/json",
            },
        });
        const promotedTweet = response.data;
        return {
            id: promotedTweet.id,
            name: promotedTweet.tweet_id,
            adset_id: promotedTweet.line_item_id,
            status: promotedTweet.entity_status,
            creative_id: promotedTweet.tweet_id,
        };
    }
    async createAd(params) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/promoted_tweets`);
        const body = {
            line_item_id: params.adset_id,
            tweet_ids: [params.creative_id],
        };
        const response = await this.makeRequest("POST", url, body, {
            headers: {
                Authorization: this.getOAuthHeader("POST", url),
                "Content-Type": "application/json",
            },
        });
        return { id: response.data[0]?.id, ...params };
    }
    async updateAd(adId, params) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/promoted_tweets/${adId}`);
        const body = {};
        if (params.status)
            body.entity_status = params.status;
        await this.makeRequest("PUT", url, body, {
            headers: {
                Authorization: this.getOAuthHeader("PUT", url),
                "Content-Type": "application/json",
            },
        });
        return this.getAd(adId);
    }
    async deleteAd(adId) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/promoted_tweets/${adId}`);
        await this.makeRequest("DELETE", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("DELETE", url),
                "Content-Type": "application/json",
            },
        });
        return { success: true };
    }
    // ============= MEDIA CREATIVES =============
    async getCreatives(params) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/media_creatives`);
        const queryParams = {
            count: (params?.limit || 100).toString(),
        };
        const response = await this.makeRequest("GET", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("GET", url, queryParams),
                "Content-Type": "application/json",
            },
            params: queryParams,
        });
        return (response.data || []).map((creative) => ({
            id: creative.id,
            name: creative.id,
            line_item_id: creative.line_item_id,
        }));
    }
    async getCreative(creativeId) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/media_creatives/${creativeId}`);
        const response = await this.makeRequest("GET", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("GET", url),
                "Content-Type": "application/json",
            },
        });
        const creative = response.data;
        return {
            id: creative.id,
            name: creative.id,
            line_item_id: creative.line_item_id,
        };
    }
    async createCreative(params) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/media_creatives`);
        const body = {
            line_item_id: params.line_item_id,
            account_media_id: params.video_id,
        };
        const response = await this.makeRequest("POST", url, body, {
            headers: {
                Authorization: this.getOAuthHeader("POST", url),
                "Content-Type": "application/json",
            },
        });
        return { id: response.data.id, ...params };
    }
    async updateCreative(creativeId, params) {
        // Twitter doesn't support updating media creatives directly
        return this.getCreative(creativeId);
    }
    async deleteCreative(creativeId) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/media_creatives/${creativeId}`);
        await this.makeRequest("DELETE", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("DELETE", url),
                "Content-Type": "application/json",
            },
        });
        return { success: true };
    }
    // ============= TAILORED AUDIENCES =============
    async getAudiences(params) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/tailored_audiences`);
        const queryParams = {
            count: (params?.limit || 100).toString(),
        };
        const response = await this.makeRequest("GET", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("GET", url, queryParams),
                "Content-Type": "application/json",
            },
            params: queryParams,
        });
        return (response.data || []).map((audience) => ({
            id: audience.id,
            name: audience.name,
            description: audience.description,
            subtype: audience.audience_type,
        }));
    }
    async getAudience(audienceId) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/tailored_audiences/${audienceId}`);
        const response = await this.makeRequest("GET", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("GET", url),
                "Content-Type": "application/json",
            },
        });
        const audience = response.data;
        return {
            id: audience.id,
            name: audience.name,
            description: audience.description,
            subtype: audience.audience_type,
        };
    }
    async createAudience(params) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/tailored_audiences`);
        const body = {
            name: params.name,
            list_type: "TWITTER_ID",
        };
        const response = await this.makeRequest("POST", url, body, {
            headers: {
                Authorization: this.getOAuthHeader("POST", url),
                "Content-Type": "application/json",
            },
        });
        return { id: response.data.id, ...params };
    }
    async updateAudience(audienceId, params) {
        // Twitter tailored audiences don't support direct updates
        return this.getAudience(audienceId);
    }
    async deleteAudience(audienceId) {
        const url = this.getUrl(`accounts/${this.config.adAccountId}/tailored_audiences/${audienceId}`);
        await this.makeRequest("DELETE", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("DELETE", url),
                "Content-Type": "application/json",
            },
        });
        return { success: true };
    }
    // ============= ANALYTICS =============
    async getAccountInsights(params) {
        const url = this.getUrl(`stats/accounts/${this.config.adAccountId}`);
        const dateRange = this.getDateRange(params);
        const queryParams = {
            start_time: dateRange.since,
            end_time: dateRange.until,
            granularity: "TOTAL",
            metric_groups: "ENGAGEMENT,BILLING",
        };
        const response = await this.makeRequest("GET", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("GET", url, queryParams),
                "Content-Type": "application/json",
            },
            params: queryParams,
        });
        const data = response.data?.[0]?.id_data?.[0]?.metrics || {};
        return {
            account_id: this.config.adAccountId,
            platform: this.platform,
            date_range: dateRange,
            summary: {
                impressions: parseInt(data.impressions?.[0] || "0", 10),
                clicks: parseInt(data.clicks?.[0] || "0", 10),
                spend: parseFloat(data.billed_charge_local_micro?.[0] || "0") / 1000000,
                reach: parseInt(data.reach?.[0] || "0", 10),
            },
        };
    }
    async getCampaignInsights(campaignId, params) {
        const url = this.getUrl(`stats/accounts/${this.config.adAccountId}/campaigns`);
        const dateRange = this.getDateRange(params);
        const queryParams = {
            campaign_ids: campaignId,
            start_time: dateRange.since,
            end_time: dateRange.until,
            granularity: params.breakdowns?.includes("day") ? "DAY" : "TOTAL",
            metric_groups: "ENGAGEMENT,BILLING",
        };
        const response = await this.makeRequest("GET", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("GET", url, queryParams),
                "Content-Type": "application/json",
            },
            params: queryParams,
        });
        return this.parseTwitterInsights(response.data || [], "campaign");
    }
    async getAdSetInsights(adSetId, params) {
        const url = this.getUrl(`stats/accounts/${this.config.adAccountId}/line_items`);
        const dateRange = this.getDateRange(params);
        const queryParams = {
            line_item_ids: adSetId,
            start_time: dateRange.since,
            end_time: dateRange.until,
            granularity: params.breakdowns?.includes("day") ? "DAY" : "TOTAL",
            metric_groups: "ENGAGEMENT,BILLING",
        };
        const response = await this.makeRequest("GET", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("GET", url, queryParams),
                "Content-Type": "application/json",
            },
            params: queryParams,
        });
        return this.parseTwitterInsights(response.data || [], "adset");
    }
    async getAdInsights(adId, params) {
        const url = this.getUrl(`stats/accounts/${this.config.adAccountId}/promoted_tweets`);
        const dateRange = this.getDateRange(params);
        const queryParams = {
            promoted_tweet_ids: adId,
            start_time: dateRange.since,
            end_time: dateRange.until,
            granularity: params.breakdowns?.includes("day") ? "DAY" : "TOTAL",
            metric_groups: "ENGAGEMENT,BILLING",
        };
        const response = await this.makeRequest("GET", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("GET", url, queryParams),
                "Content-Type": "application/json",
            },
            params: queryParams,
        });
        return this.parseTwitterInsights(response.data || [], "ad");
    }
    async getInsights(params) {
        const level = params.level || "campaign";
        const dateRange = this.getDateRange(params);
        let endpoint;
        switch (level) {
            case "adset":
                endpoint = "line_items";
                break;
            case "ad":
                endpoint = "promoted_tweets";
                break;
            default:
                endpoint = "campaigns";
        }
        const url = this.getUrl(`stats/accounts/${this.config.adAccountId}/${endpoint}`);
        const queryParams = {
            start_time: dateRange.since,
            end_time: dateRange.until,
            granularity: params.breakdowns?.includes("day") ? "DAY" : "TOTAL",
            metric_groups: "ENGAGEMENT,BILLING",
        };
        const response = await this.makeRequest("GET", url, null, {
            headers: {
                Authorization: this.getOAuthHeader("GET", url, queryParams),
                "Content-Type": "application/json",
            },
            params: queryParams,
        });
        return this.parseTwitterInsights(response.data || [], level);
    }
    parseTwitterInsights(data, level) {
        const results = [];
        for (const item of data) {
            const idData = item.id_data || [];
            for (const metrics of idData) {
                results.push({
                    [level === "campaign"
                        ? "campaign_id"
                        : level === "adset"
                            ? "adset_id"
                            : "ad_id"]: item.id,
                    date_start: metrics.segment?.start_time,
                    date_stop: metrics.segment?.end_time,
                    impressions: parseInt(metrics.metrics?.impressions?.[0] || "0", 10),
                    clicks: parseInt(metrics.metrics?.clicks?.[0] || "0", 10),
                    spend: parseFloat(metrics.metrics?.billed_charge_local_micro?.[0] || "0") /
                        1000000,
                    reach: parseInt(metrics.metrics?.reach?.[0] || "0", 10),
                    ctr: 0, // Calculate if needed
                    cpc: 0, // Calculate if needed
                });
            }
        }
        return results;
    }
    getDateRange(params) {
        if (params.time_range) {
            return {
                since: new Date(params.time_range.since).toISOString(),
                until: new Date(params.time_range.until).toISOString(),
            };
        }
        const today = new Date();
        const since = new Date(today);
        switch (params.date_preset) {
            case "today":
                break;
            case "yesterday":
                since.setDate(since.getDate() - 1);
                today.setDate(today.getDate() - 1);
                break;
            case "last_7d":
                since.setDate(since.getDate() - 7);
                break;
            case "last_30d":
            default:
                since.setDate(since.getDate() - 30);
                break;
        }
        return {
            since: since.toISOString(),
            until: today.toISOString(),
        };
    }
}
exports.TwitterAdsClient = TwitterAdsClient;
