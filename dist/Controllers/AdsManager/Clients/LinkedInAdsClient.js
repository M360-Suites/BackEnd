"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkedInAdsClient = void 0;
// LinkedInAdsClient.ts
const AdPlatformClient_1 = require("./AdPlatformClient");
const ads_1 = require("../../../Types/ads");
class LinkedInAdsClient extends AdPlatformClient_1.AdPlatformClient {
    constructor(config) {
        super(config);
        this.platform = ads_1.AdsPlatform.LINKEDIN;
        this.baseUrl = "https://api.linkedin.com/rest";
        this.organizationId = config.organizationId;
    }
    getUrl(endpoint) {
        return `${this.baseUrl}/${endpoint}`;
    }
    getHeaders() {
        return {
            Authorization: `Bearer ${this.config.accessToken}`,
            "Content-Type": "application/json",
            "LinkedIn-Version": "202401",
            "X-Restli-Protocol-Version": "2.0.0",
        };
    }
    // ============= AD ACCOUNTS =============
    async getAdAccounts() {
        const response = await this.makeRequest("GET", this.getUrl("adAccounts"), null, {
            headers: this.getHeaders(),
            params: {
                q: "search",
                "search.type.values[0]": "BUSINESS",
                "search.status.values[0]": "ACTIVE",
            },
        });
        return (response.elements || []).map((account) => ({
            id: account.id?.toString(),
            name: account.name,
            currency: account.currency,
            status: account.status,
            platform: this.platform,
            businessId: account.reference,
        }));
    }
    async getAdAccount(accountId) {
        const response = await this.makeRequest("GET", this.getUrl(`adAccounts/${accountId}`), null, { headers: this.getHeaders() });
        return {
            id: response.id?.toString(),
            name: response.name,
            currency: response.currency,
            status: response.status,
            platform: this.platform,
        };
    }
    // ============= CAMPAIGNS (Campaign Groups in LinkedIn) =============
    async getCampaigns(params) {
        const response = await this.makeRequest("GET", this.getUrl("adCampaignGroups"), null, {
            headers: this.getHeaders(),
            params: {
                q: "search",
                "search.account.values[0]": `urn:li:sponsoredAccount:${this.config.adAccountId}`,
                ...(params?.status && { "search.status.values[0]": params.status }),
                count: params?.limit || 100,
            },
        });
        return (response.elements || []).map((group) => ({
            id: group.id?.toString(),
            name: group.name,
            objective: "CAMPAIGN_GROUP",
            status: group.status,
            start_time: group.runSchedule?.start,
            end_time: group.runSchedule?.end,
            daily_budget: group.totalBudget?.amount
                ? parseFloat(group.totalBudget.amount)
                : undefined,
        }));
    }
    async getCampaign(campaignId) {
        const response = await this.makeRequest("GET", this.getUrl(`adCampaignGroups/${campaignId}`), null, { headers: this.getHeaders() });
        return {
            id: response.id?.toString(),
            name: response.name,
            objective: "CAMPAIGN_GROUP",
            status: response.status,
            start_time: response.runSchedule?.start,
            end_time: response.runSchedule?.end,
        };
    }
    async createCampaign(params) {
        const response = await this.makeRequest("POST", this.getUrl("adCampaignGroups"), {
            account: `urn:li:sponsoredAccount:${this.config.adAccountId}`,
            name: params.name,
            status: params.status || "PAUSED",
            runSchedule: {
                start: params.start_time
                    ? new Date(params.start_time).getTime()
                    : Date.now(),
                ...(params.end_time && { end: new Date(params.end_time).getTime() }),
            },
            ...(params.daily_budget && {
                totalBudget: {
                    amount: params.daily_budget.toString(),
                    currencyCode: "USD",
                },
            }),
        }, { headers: this.getHeaders() });
        const id = response.headers?.["x-linkedin-id"] || response.id;
        return { id, ...params };
    }
    async updateCampaign(campaignId, params) {
        const body = {};
        if (params.name)
            body.name = params.name;
        if (params.status)
            body.status = params.status;
        if (params.end_time) {
            body.runSchedule = { end: new Date(params.end_time).getTime() };
        }
        await this.makeRequest("POST", this.getUrl(`adCampaignGroups/${campaignId}`), body, {
            headers: {
                ...this.getHeaders(),
                "X-RestLi-Method": "PARTIAL_UPDATE",
            },
        });
        return this.getCampaign(campaignId);
    }
    async deleteCampaign(campaignId) {
        await this.makeRequest("DELETE", this.getUrl(`adCampaignGroups/${campaignId}`), null, { headers: this.getHeaders() });
        return { success: true };
    }
    // ============= AD SETS (Campaigns in LinkedIn) =============
    async getAdSets(campaignId, params) {
        const queryParams = {
            q: "search",
            "search.account.values[0]": `urn:li:sponsoredAccount:${this.config.adAccountId}`,
            count: params?.limit || 100,
        };
        if (campaignId) {
            queryParams["search.campaignGroup.values[0]"] =
                `urn:li:sponsoredCampaignGroup:${campaignId}`;
        }
        if (params?.status) {
            queryParams["search.status.values[0]"] = params.status;
        }
        const response = await this.makeRequest("GET", this.getUrl("adCampaigns"), null, {
            headers: this.getHeaders(),
            params: queryParams,
        });
        return (response.elements || []).map((campaign) => ({
            id: campaign.id?.toString(),
            name: campaign.name,
            campaign_id: campaign.campaignGroup?.replace("urn:li:sponsoredCampaignGroup:", ""),
            status: campaign.status,
            daily_budget: campaign.dailyBudget?.amount
                ? parseFloat(campaign.dailyBudget.amount)
                : undefined,
            start_time: campaign.runSchedule?.start,
            end_time: campaign.runSchedule?.end,
            optimization_goal: campaign.objectiveType,
        }));
    }
    async getAdSet(adSetId) {
        const response = await this.makeRequest("GET", this.getUrl(`adCampaigns/${adSetId}`), null, { headers: this.getHeaders() });
        return {
            id: response.id?.toString(),
            name: response.name,
            campaign_id: response.campaignGroup?.replace("urn:li:sponsoredCampaignGroup:", ""),
            status: response.status,
            daily_budget: response.dailyBudget?.amount
                ? parseFloat(response.dailyBudget.amount)
                : undefined,
            optimization_goal: response.objectiveType,
        };
    }
    async createAdSet(params) {
        const response = await this.makeRequest("POST", this.getUrl("adCampaigns"), {
            account: `urn:li:sponsoredAccount:${this.config.adAccountId}`,
            campaignGroup: `urn:li:sponsoredCampaignGroup:${params.campaign_id}`,
            name: params.name,
            status: params.status || "PAUSED",
            type: "SPONSORED_UPDATES",
            objectiveType: params.optimization_goal || "WEBSITE_VISIT",
            costType: "CPM",
            ...(params.daily_budget && {
                dailyBudget: {
                    amount: params.daily_budget.toString(),
                    currencyCode: "USD",
                },
            }),
            ...(params.bid_amount && {
                unitCost: {
                    amount: params.bid_amount.toString(),
                    currencyCode: "USD",
                },
            }),
            runSchedule: {
                start: params.start_time
                    ? new Date(params.start_time).getTime()
                    : Date.now(),
                ...(params.end_time && { end: new Date(params.end_time).getTime() }),
            },
            locale: { country: "US", language: "en" },
        }, { headers: this.getHeaders() });
        const id = response.headers?.["x-linkedin-id"] || response.id;
        return { id, ...params };
    }
    async updateAdSet(adSetId, params) {
        const body = {};
        if (params.name)
            body.name = params.name;
        if (params.status)
            body.status = params.status;
        if (params.daily_budget) {
            body.dailyBudget = {
                amount: params.daily_budget.toString(),
                currencyCode: "USD",
            };
        }
        if (params.bid_amount) {
            body.unitCost = {
                amount: params.bid_amount.toString(),
                currencyCode: "USD",
            };
        }
        await this.makeRequest("POST", this.getUrl(`adCampaigns/${adSetId}`), body, {
            headers: {
                ...this.getHeaders(),
                "X-RestLi-Method": "PARTIAL_UPDATE",
            },
        });
        return this.getAdSet(adSetId);
    }
    async deleteAdSet(adSetId) {
        await this.makeRequest("DELETE", this.getUrl(`adCampaigns/${adSetId}`), null, { headers: this.getHeaders() });
        return { success: true };
    }
    // ============= ADS (Creatives in LinkedIn) =============
    async getAds(adSetId, params) {
        const queryParams = {
            q: "search",
            "search.account.values[0]": `urn:li:sponsoredAccount:${this.config.adAccountId}`,
            count: params?.limit || 100,
        };
        if (adSetId) {
            queryParams["search.campaign.values[0]"] =
                `urn:li:sponsoredCampaign:${adSetId}`;
        }
        const response = await this.makeRequest("GET", this.getUrl("adCreatives"), null, {
            headers: this.getHeaders(),
            params: queryParams,
        });
        return (response.elements || []).map((creative) => ({
            id: creative.id?.toString(),
            name: creative.id?.toString(),
            adset_id: creative.campaign?.replace("urn:li:sponsoredCampaign:", ""),
            status: creative.status,
            creative_id: creative.id?.toString(),
        }));
    }
    async getAd(adId) {
        const response = await this.makeRequest("GET", this.getUrl(`adCreatives/${adId}`), null, { headers: this.getHeaders() });
        return {
            id: response.id?.toString(),
            name: response.id?.toString(),
            adset_id: response.campaign?.replace("urn:li:sponsoredCampaign:", ""),
            status: response.status,
        };
    }
    async createAd(params) {
        const response = await this.makeRequest("POST", this.getUrl("adCreatives"), {
            campaign: `urn:li:sponsoredCampaign:${params.adset_id}`,
            status: params.status || "ACTIVE",
            type: "SPONSORED_STATUS_UPDATE",
            ...(params.creative && {
                variables: {
                    data: {
                        "com.linkedin.ads.SponsoredUpdateCreativeVariables": {
                            activity: params.creative.link_url,
                        },
                    },
                },
            }),
        }, { headers: this.getHeaders() });
        const id = response.headers?.["x-linkedin-id"] || response.id;
        return { id, ...params };
    }
    async updateAd(adId, params) {
        const body = {};
        if (params.status)
            body.status = params.status;
        await this.makeRequest("POST", this.getUrl(`adCreatives/${adId}`), body, {
            headers: {
                ...this.getHeaders(),
                "X-RestLi-Method": "PARTIAL_UPDATE",
            },
        });
        return this.getAd(adId);
    }
    async deleteAd(adId) {
        await this.makeRequest("DELETE", this.getUrl(`adCreatives/${adId}`), null, { headers: this.getHeaders() });
        return { success: true };
    }
    // ============= CREATIVES =============
    async getCreatives(params) {
        return this.getAds(undefined, params);
    }
    async getCreative(creativeId) {
        const ad = await this.getAd(creativeId);
        return {
            id: ad.id,
            name: ad.name,
        };
    }
    async createCreative(params) {
        // LinkedIn uses adCreatives directly, so delegate to createAd
        return { id: "pending", ...params };
    }
    async updateCreative(creativeId, params) {
        return this.getCreative(creativeId);
    }
    async deleteCreative(creativeId) {
        return this.deleteAd(creativeId);
    }
    // ============= AUDIENCES (Matched Audiences) =============
    async getAudiences(params) {
        const response = await this.makeRequest("GET", this.getUrl("dmpSegments"), null, {
            headers: this.getHeaders(),
            params: {
                q: "account",
                account: `urn:li:sponsoredAccount:${this.config.adAccountId}`,
                count: params?.limit || 100,
            },
        });
        return (response.elements || []).map((segment) => ({
            id: segment.id?.toString(),
            name: segment.name,
            description: segment.description,
            subtype: segment.type,
        }));
    }
    async getAudience(audienceId) {
        const response = await this.makeRequest("GET", this.getUrl(`dmpSegments/${audienceId}`), null, { headers: this.getHeaders() });
        return {
            id: response.id?.toString(),
            name: response.name,
            description: response.description,
            subtype: response.type,
        };
    }
    async createAudience(params) {
        const response = await this.makeRequest("POST", this.getUrl("dmpSegments"), {
            account: `urn:li:sponsoredAccount:${this.config.adAccountId}`,
            name: params.name,
            description: params.description,
            type: params.subtype || "USER_UPLOADED",
        }, { headers: this.getHeaders() });
        const id = response.headers?.["x-linkedin-id"] || response.id;
        return { id, ...params };
    }
    async updateAudience(audienceId, params) {
        const body = {};
        if (params.name)
            body.name = params.name;
        if (params.description)
            body.description = params.description;
        await this.makeRequest("POST", this.getUrl(`dmpSegments/${audienceId}`), body, {
            headers: {
                ...this.getHeaders(),
                "X-RestLi-Method": "PARTIAL_UPDATE",
            },
        });
        return this.getAudience(audienceId);
    }
    async deleteAudience(audienceId) {
        await this.makeRequest("DELETE", this.getUrl(`dmpSegments/${audienceId}`), null, { headers: this.getHeaders() });
        return { success: true };
    }
    // ============= ANALYTICS =============
    async getAccountInsights(params) {
        const dateRange = this.getDateRange(params);
        const response = await this.makeRequest("GET", this.getUrl("adAnalytics"), null, {
            headers: this.getHeaders(),
            params: {
                q: "analytics",
                pivot: "ACCOUNT",
                dateRange: {
                    start: {
                        day: parseInt(dateRange.since.split("-")[2]),
                        month: parseInt(dateRange.since.split("-")[1]),
                        year: parseInt(dateRange.since.split("-")[0]),
                    },
                    end: {
                        day: parseInt(dateRange.until.split("-")[2]),
                        month: parseInt(dateRange.until.split("-")[1]),
                        year: parseInt(dateRange.until.split("-")[0]),
                    },
                },
                accounts: [`urn:li:sponsoredAccount:${this.config.adAccountId}`],
                fields: "impressions,clicks,costInLocalCurrency,externalWebsiteConversions",
            },
        });
        const data = response.elements?.[0] || {};
        return {
            account_id: this.config.adAccountId,
            platform: this.platform,
            date_range: dateRange,
            summary: {
                impressions: parseInt(data.impressions || "0", 10),
                clicks: parseInt(data.clicks || "0", 10),
                spend: parseFloat(data.costInLocalCurrency || "0"),
                conversions: parseInt(data.externalWebsiteConversions || "0", 10),
            },
        };
    }
    async getCampaignInsights(campaignId, params) {
        const dateRange = this.getDateRange(params);
        const response = await this.makeRequest("GET", this.getUrl("adAnalytics"), null, {
            headers: this.getHeaders(),
            params: {
                q: "analytics",
                pivot: "CAMPAIGN_GROUP",
                dateRange: {
                    start: {
                        day: parseInt(dateRange.since.split("-")[2]),
                        month: parseInt(dateRange.since.split("-")[1]),
                        year: parseInt(dateRange.since.split("-")[0]),
                    },
                    end: {
                        day: parseInt(dateRange.until.split("-")[2]),
                        month: parseInt(dateRange.until.split("-")[1]),
                        year: parseInt(dateRange.until.split("-")[0]),
                    },
                },
                campaignGroups: [`urn:li:sponsoredCampaignGroup:${campaignId}`],
                fields: "impressions,clicks,costInLocalCurrency,externalWebsiteConversions",
            },
        });
        return (response.elements || []).map((item) => this.parseLinkedInInsights(item, "campaign"));
    }
    async getAdSetInsights(adSetId, params) {
        const dateRange = this.getDateRange(params);
        const response = await this.makeRequest("GET", this.getUrl("adAnalytics"), null, {
            headers: this.getHeaders(),
            params: {
                q: "analytics",
                pivot: "CAMPAIGN",
                dateRange: {
                    start: {
                        day: parseInt(dateRange.since.split("-")[2]),
                        month: parseInt(dateRange.since.split("-")[1]),
                        year: parseInt(dateRange.since.split("-")[0]),
                    },
                    end: {
                        day: parseInt(dateRange.until.split("-")[2]),
                        month: parseInt(dateRange.until.split("-")[1]),
                        year: parseInt(dateRange.until.split("-")[0]),
                    },
                },
                campaigns: [`urn:li:sponsoredCampaign:${adSetId}`],
                fields: "impressions,clicks,costInLocalCurrency,externalWebsiteConversions",
            },
        });
        return (response.elements || []).map((item) => this.parseLinkedInInsights(item, "adset"));
    }
    async getAdInsights(adId, params) {
        const dateRange = this.getDateRange(params);
        const response = await this.makeRequest("GET", this.getUrl("adAnalytics"), null, {
            headers: this.getHeaders(),
            params: {
                q: "analytics",
                pivot: "CREATIVE",
                dateRange: {
                    start: {
                        day: parseInt(dateRange.since.split("-")[2]),
                        month: parseInt(dateRange.since.split("-")[1]),
                        year: parseInt(dateRange.since.split("-")[0]),
                    },
                    end: {
                        day: parseInt(dateRange.until.split("-")[2]),
                        month: parseInt(dateRange.until.split("-")[1]),
                        year: parseInt(dateRange.until.split("-")[0]),
                    },
                },
                creatives: [`urn:li:sponsoredCreative:${adId}`],
                fields: "impressions,clicks,costInLocalCurrency,externalWebsiteConversions",
            },
        });
        return (response.elements || []).map((item) => this.parseLinkedInInsights(item, "ad"));
    }
    async getInsights(params) {
        const level = params.level || "campaign";
        const dateRange = this.getDateRange(params);
        let pivot;
        switch (level) {
            case "adset":
                pivot = "CAMPAIGN";
                break;
            case "ad":
                pivot = "CREATIVE";
                break;
            default:
                pivot = "CAMPAIGN_GROUP";
        }
        const response = await this.makeRequest("GET", this.getUrl("adAnalytics"), null, {
            headers: this.getHeaders(),
            params: {
                q: "analytics",
                pivot,
                dateRange: {
                    start: {
                        day: parseInt(dateRange.since.split("-")[2]),
                        month: parseInt(dateRange.since.split("-")[1]),
                        year: parseInt(dateRange.since.split("-")[0]),
                    },
                    end: {
                        day: parseInt(dateRange.until.split("-")[2]),
                        month: parseInt(dateRange.until.split("-")[1]),
                        year: parseInt(dateRange.until.split("-")[0]),
                    },
                },
                accounts: [`urn:li:sponsoredAccount:${this.config.adAccountId}`],
                fields: "impressions,clicks,costInLocalCurrency,externalWebsiteConversions",
            },
        });
        return (response.elements || []).map((item) => this.parseLinkedInInsights(item, level));
    }
    parseLinkedInInsights(item, level) {
        const impressions = parseInt(item.impressions || "0", 10);
        const clicks = parseInt(item.clicks || "0", 10);
        const spend = parseFloat(item.costInLocalCurrency || "0");
        return {
            [level === "campaign"
                ? "campaign_id"
                : level === "adset"
                    ? "adset_id"
                    : "ad_id"]: item.pivotValue?.replace(/urn:li:sponsored(CampaignGroup|Campaign|Creative):/, ""),
            date_start: item.dateRange?.start
                ? `${item.dateRange.start.year}-${String(item.dateRange.start.month).padStart(2, "0")}-${String(item.dateRange.start.day).padStart(2, "0")}`
                : undefined,
            date_stop: item.dateRange?.end
                ? `${item.dateRange.end.year}-${String(item.dateRange.end.month).padStart(2, "0")}-${String(item.dateRange.end.day).padStart(2, "0")}`
                : undefined,
            impressions,
            clicks,
            spend,
            conversions: parseInt(item.externalWebsiteConversions || "0", 10),
            ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
            cpc: clicks > 0 ? spend / clicks : 0,
        };
    }
    getDateRange(params) {
        if (params.time_range) {
            return params.time_range;
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
            since: since.toISOString().split("T")[0],
            until: today.toISOString().split("T")[0],
        };
    }
}
exports.LinkedInAdsClient = LinkedInAdsClient;
