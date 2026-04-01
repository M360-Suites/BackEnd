"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAdsClient = void 0;
// GoogleAdsClient.ts - Fixed and completed
const AdPlatformClient_1 = require("./AdPlatformClient");
const ads_1 = require("../../../Types/ads");
// interface GoogleAdsConfig extends AdPlatformConfig {
//   developerToken: string;
//   clientId: string;
//   clientSecret: string;
//   refreshToken: string;
// }
class GoogleAdsClient extends AdPlatformClient_1.AdPlatformClient {
    constructor(config) {
        super(config);
        this.platform = ads_1.AdsPlatform.GOOGLE;
        this.baseUrl = "https://googleads.googleapis.com";
        this.apiVersion = "v15";
        this.developerToken = config.developerToken;
        this.loginCustomerId = config.loginCustomerId;
    }
    getUrl(endpoint) {
        return `${this.baseUrl}/${this.apiVersion}/${endpoint}`;
    }
    getHeaders() {
        return {
            Authorization: `Bearer ${this.config.accessToken}`,
            "developer-token": this.developerToken,
            "Content-Type": "application/json",
            ...(this.loginCustomerId && {
                "login-customer-id": this.loginCustomerId,
            }),
        };
    }
    formatCustomerId(customerId) {
        return customerId.replace(/-/g, "");
    }
    // ============= AD ACCOUNTS =============
    async getAdAccounts() {
        const response = await this.makeRequest("GET", this.getUrl("customers:listAccessibleCustomers"), null, { headers: this.getHeaders() });
        const accounts = [];
        for (const resourceName of response.resourceNames || []) {
            const customerId = resourceName.split("/")[1];
            try {
                const account = await this.getAdAccount(customerId);
                accounts.push(account);
            }
            catch (e) {
                // Skip accounts we can't access
            }
        }
        return accounts;
    }
    async getAdAccount(accountId) {
        const customerId = this.formatCustomerId(accountId);
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/googleAds:searchStream`), {
            query: `
          SELECT
            customer.id,
            customer.descriptive_name,
            customer.currency_code,
            customer.time_zone,
            customer.status
          FROM customer
          LIMIT 1
        `,
        }, { headers: this.getHeaders() });
        const customer = response[0]?.results?.[0]?.customer || {};
        return {
            id: customer.id?.toString() || customerId,
            name: customer.descriptiveName || "Unknown",
            currency: customer.currencyCode,
            timezone: customer.timeZone,
            status: customer.status,
            platform: this.platform,
        };
    }
    // ============= CAMPAIGNS =============
    async getCampaigns(params) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        let query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.start_date,
        campaign.end_date,
        campaign_budget.amount_micros
      FROM campaign
    `;
        if (params?.status) {
            query += ` WHERE campaign.status = '${params.status}'`;
        }
        query += ` LIMIT ${params?.limit || 100}`;
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/googleAds:searchStream`), { query }, { headers: this.getHeaders() });
        return (response[0]?.results || []).map((result) => ({
            id: result.campaign.id?.toString(),
            name: result.campaign.name,
            objective: result.campaign.advertisingChannelType,
            status: result.campaign.status,
            start_time: result.campaign.startDate,
            end_time: result.campaign.endDate,
            daily_budget: result.campaignBudget?.amountMicros
                ? parseInt(result.campaignBudget.amountMicros, 10) / 1000000
                : undefined,
        }));
    }
    async getCampaign(campaignId) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/googleAds:searchStream`), {
            query: `
          SELECT
            campaign.id,
            campaign.name,
            campaign.status,
            campaign.advertising_channel_type,
            campaign.start_date,
            campaign.end_date,
            campaign_budget.amount_micros,
            campaign.bidding_strategy_type
          FROM campaign
          WHERE campaign.id = ${campaignId}
        `,
        }, { headers: this.getHeaders() });
        const result = response[0]?.results?.[0] || {};
        return {
            id: result.campaign?.id?.toString(),
            name: result.campaign?.name,
            objective: result.campaign?.advertisingChannelType,
            status: result.campaign?.status,
            start_time: result.campaign?.startDate,
            end_time: result.campaign?.endDate,
            daily_budget: result.campaignBudget?.amountMicros
                ? parseInt(result.campaignBudget.amountMicros, 10) / 1000000
                : undefined,
            bid_strategy: result.campaign?.biddingStrategyType,
        };
    }
    async createCampaign(params) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        // First create the budget
        const budgetResponse = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/campaignBudgets:mutate`), {
            operations: [
                {
                    create: {
                        name: `${params.name} Budget`,
                        amountMicros: Math.round((params.daily_budget || 1000) * 1000000).toString(),
                        deliveryMethod: "STANDARD",
                    },
                },
            ],
        }, { headers: this.getHeaders() });
        const budgetResourceName = budgetResponse.results?.[0]?.resourceName;
        // Then create the campaign
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/campaigns:mutate`), {
            operations: [
                {
                    create: {
                        name: params.name,
                        status: params.status || "PAUSED",
                        advertisingChannelType: this.mapObjectiveToChannelType(params.objective),
                        campaignBudget: budgetResourceName,
                        ...(params.start_time && {
                            startDate: this.formatDateForApi(params.start_time),
                        }),
                        ...(params.end_time && {
                            endDate: this.formatDateForApi(params.end_time),
                        }),
                    },
                },
            ],
        }, { headers: this.getHeaders() });
        const campaignResourceName = response.results?.[0]?.resourceName;
        const campaignId = campaignResourceName?.split("/").pop();
        return { id: campaignId, ...params };
    }
    async updateCampaign(campaignId, params) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const resourceName = `customers/${customerId}/campaigns/${campaignId}`;
        const updateMask = [];
        const updateData = { resourceName };
        if (params.name) {
            updateData.name = params.name;
            updateMask.push("name");
        }
        if (params.status) {
            updateData.status = params.status;
            updateMask.push("status");
        }
        if (params.end_time) {
            updateData.endDate = this.formatDateForApi(params.end_time);
            updateMask.push("end_date");
        }
        await this.makeRequest("POST", this.getUrl(`customers/${customerId}/campaigns:mutate`), {
            operations: [
                {
                    update: updateData,
                    updateMask: updateMask.join(","),
                },
            ],
        }, { headers: this.getHeaders() });
        return this.getCampaign(campaignId);
    }
    async deleteCampaign(campaignId) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const resourceName = `customers/${customerId}/campaigns/${campaignId}`;
        await this.makeRequest("POST", this.getUrl(`customers/${customerId}/campaigns:mutate`), {
            operations: [
                {
                    remove: resourceName,
                },
            ],
        }, { headers: this.getHeaders() });
        return { success: true };
    }
    mapObjectiveToChannelType(objective) {
        const mapping = {
            AWARENESS: "DISPLAY",
            TRAFFIC: "SEARCH",
            ENGAGEMENT: "DISPLAY",
            LEADS: "SEARCH",
            SALES: "SHOPPING",
            VIDEO_VIEWS: "VIDEO",
            APP_PROMOTION: "MULTI_CHANNEL",
        };
        return mapping[objective] || "SEARCH";
    }
    // ============= AD GROUPS =============
    async getAdSets(campaignId, params) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        let query = `
      SELECT
        ad_group.id,
        ad_group.name,
        ad_group.status,
        ad_group.campaign,
        ad_group.cpc_bid_micros,
        ad_group.type
      FROM ad_group
    `;
        const conditions = [];
        if (campaignId) {
            conditions.push(`ad_group.campaign = 'customers/${customerId}/campaigns/${campaignId}'`);
        }
        if (params?.status) {
            conditions.push(`ad_group.status = '${params.status}'`);
        }
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(" AND ")}`;
        }
        query += ` LIMIT ${params?.limit || 100}`;
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/googleAds:searchStream`), { query }, { headers: this.getHeaders() });
        return (response[0]?.results || []).map((result) => ({
            id: result.adGroup.id?.toString(),
            name: result.adGroup.name,
            campaign_id: result.adGroup.campaign?.split("/").pop(),
            status: result.adGroup.status,
            bid_amount: result.adGroup.cpcBidMicros
                ? parseInt(result.adGroup.cpcBidMicros, 10) / 1000000
                : undefined,
        }));
    }
    async getAdSet(adSetId) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/googleAds:searchStream`), {
            query: `
          SELECT
            ad_group.id,
            ad_group.name,
            ad_group.status,
            ad_group.campaign,
            ad_group.cpc_bid_micros,
            ad_group.type
          FROM ad_group
          WHERE ad_group.id = ${adSetId}
        `,
        }, { headers: this.getHeaders() });
        const result = response[0]?.results?.[0] || {};
        return {
            id: result.adGroup?.id?.toString(),
            name: result.adGroup?.name,
            campaign_id: result.adGroup?.campaign?.split("/").pop(),
            status: result.adGroup?.status,
            bid_amount: result.adGroup?.cpcBidMicros
                ? parseInt(result.adGroup.cpcBidMicros, 10) / 1000000
                : undefined,
        };
    }
    async createAdSet(params) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/adGroups:mutate`), {
            operations: [
                {
                    create: {
                        name: params.name,
                        campaign: `customers/${customerId}/campaigns/${params.campaign_id}`,
                        status: params.status || "PAUSED",
                        type: "SEARCH_STANDARD",
                        ...(params.bid_amount && {
                            cpcBidMicros: Math.round(params.bid_amount * 1000000).toString(),
                        }),
                    },
                },
            ],
        }, { headers: this.getHeaders() });
        const resourceName = response.results?.[0]?.resourceName;
        const adGroupId = resourceName?.split("/").pop();
        return { id: adGroupId, ...params };
    }
    async updateAdSet(adSetId, params) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const resourceName = `customers/${customerId}/adGroups/${adSetId}`;
        const updateMask = [];
        const updateData = { resourceName };
        if (params.name) {
            updateData.name = params.name;
            updateMask.push("name");
        }
        if (params.status) {
            updateData.status = params.status;
            updateMask.push("status");
        }
        if (params.bid_amount) {
            updateData.cpcBidMicros = Math.round(params.bid_amount * 1000000).toString();
            updateMask.push("cpc_bid_micros");
        }
        await this.makeRequest("POST", this.getUrl(`customers/${customerId}/adGroups:mutate`), {
            operations: [
                {
                    update: updateData,
                    updateMask: updateMask.join(","),
                },
            ],
        }, { headers: this.getHeaders() });
        return this.getAdSet(adSetId);
    }
    async deleteAdSet(adSetId) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const resourceName = `customers/${customerId}/adGroups/${adSetId}`;
        await this.makeRequest("POST", this.getUrl(`customers/${customerId}/adGroups:mutate`), {
            operations: [
                {
                    remove: resourceName,
                },
            ],
        }, { headers: this.getHeaders() });
        return { success: true };
    }
    // ============= ADS =============
    async getAds(adSetId, params) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        let query = `
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad.name,
        ad_group_ad.status,
        ad_group_ad.ad_group,
        ad_group_ad.ad.type,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions
      FROM ad_group_ad
    `;
        const conditions = [];
        if (adSetId) {
            conditions.push(`ad_group_ad.ad_group = 'customers/${customerId}/adGroups/${adSetId}'`);
        }
        if (params?.status) {
            conditions.push(`ad_group_ad.status = '${params.status}'`);
        }
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(" AND ")}`;
        }
        query += ` LIMIT ${params?.limit || 100}`;
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/googleAds:searchStream`), { query }, { headers: this.getHeaders() });
        return (response[0]?.results || []).map((result) => ({
            id: result.adGroupAd?.ad?.id?.toString(),
            name: result.adGroupAd?.ad?.name || "Unnamed Ad",
            adset_id: result.adGroupAd?.adGroup?.split("/").pop(),
            status: result.adGroupAd?.status,
        }));
    }
    async getAd(adId) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/googleAds:searchStream`), {
            query: `
          SELECT
            ad_group_ad.ad.id,
            ad_group_ad.ad.name,
            ad_group_ad.status,
            ad_group_ad.ad_group,
            ad_group_ad.ad.type,
            ad_group_ad.ad.final_urls,
            ad_group_ad.ad.responsive_search_ad.headlines,
            ad_group_ad.ad.responsive_search_ad.descriptions
          FROM ad_group_ad
          WHERE ad_group_ad.ad.id = ${adId}
        `,
        }, { headers: this.getHeaders() });
        const result = response[0]?.results?.[0] || {};
        return {
            id: result.adGroupAd?.ad?.id?.toString(),
            name: result.adGroupAd?.ad?.name || "Unnamed Ad",
            adset_id: result.adGroupAd?.adGroup?.split("/").pop(),
            status: result.adGroupAd?.status,
        };
    }
    async createAd(params) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/adGroupAds:mutate`), {
            operations: [
                {
                    create: {
                        adGroup: `customers/${customerId}/adGroups/${params.adset_id}`,
                        status: params.status || "PAUSED",
                        ad: {
                            responsiveSearchAd: {
                                headlines: [{ text: params.name, pinnedField: "HEADLINE_1" }],
                                descriptions: [{ text: "Description" }],
                            },
                            finalUrls: ["https://example.com"],
                        },
                    },
                },
            ],
        }, { headers: this.getHeaders() });
        const resourceName = response.results?.[0]?.resourceName;
        const adId = resourceName?.split("~").pop();
        return { id: adId, ...params };
    }
    async updateAd(adId, params) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        // For Google Ads, we need the ad_group_ad resource name
        // This typically requires fetching the ad first to get its full resource name
        const ad = await this.getAd(adId);
        const resourceName = `customers/${customerId}/adGroupAds/${ad.adset_id}~${adId}`;
        const updateMask = [];
        const updateData = { resourceName };
        if (params.status) {
            updateData.status = params.status;
            updateMask.push("status");
        }
        await this.makeRequest("POST", this.getUrl(`customers/${customerId}/adGroupAds:mutate`), {
            operations: [
                {
                    update: updateData,
                    updateMask: updateMask.join(","),
                },
            ],
        }, { headers: this.getHeaders() });
        return this.getAd(adId);
    }
    async deleteAd(adId) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const ad = await this.getAd(adId);
        const resourceName = `customers/${customerId}/adGroupAds/${ad.adset_id}~${adId}`;
        await this.makeRequest("POST", this.getUrl(`customers/${customerId}/adGroupAds:mutate`), {
            operations: [
                {
                    remove: resourceName,
                },
            ],
        }, { headers: this.getHeaders() });
        return { success: true };
    }
    // ============= CREATIVES (Assets in Google Ads) =============
    async getCreatives(params) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/googleAds:searchStream`), {
            query: `
          SELECT
            asset.id,
            asset.name,
            asset.type,
            asset.text_asset.text,
            asset.image_asset.full_size.url
          FROM asset
          LIMIT ${params?.limit || 100}
        `,
        }, { headers: this.getHeaders() });
        return (response[0]?.results || []).map((result) => ({
            id: result.asset?.id?.toString(),
            name: result.asset?.name,
            body: result.asset?.textAsset?.text,
            image_url: result.asset?.imageAsset?.fullSize?.url,
        }));
    }
    async getCreative(creativeId) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/googleAds:searchStream`), {
            query: `
          SELECT
            asset.id,
            asset.name,
            asset.type,
            asset.text_asset.text,
            asset.image_asset.full_size.url
          FROM asset
          WHERE asset.id = ${creativeId}
        `,
        }, { headers: this.getHeaders() });
        const result = response[0]?.results?.[0] || {};
        return {
            id: result.asset?.id?.toString(),
            name: result.asset?.name,
            body: result.asset?.textAsset?.text,
            image_url: result.asset?.imageAsset?.fullSize?.url,
        };
    }
    async createCreative(params) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/assets:mutate`), {
            operations: [
                {
                    create: {
                        name: params.name,
                        textAsset: params.body ? { text: params.body } : undefined,
                    },
                },
            ],
        }, { headers: this.getHeaders() });
        const resourceName = response.results?.[0]?.resourceName;
        const assetId = resourceName?.split("/").pop();
        return { id: assetId, ...params };
    }
    async updateCreative(creativeId, params) {
        // Google Ads assets are generally immutable, so we return the existing creative
        return this.getCreative(creativeId);
    }
    async deleteCreative(creativeId) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const resourceName = `customers/${customerId}/assets/${creativeId}`;
        await this.makeRequest("POST", this.getUrl(`customers/${customerId}/assets:mutate`), {
            operations: [
                {
                    remove: resourceName,
                },
            ],
        }, { headers: this.getHeaders() });
        return { success: true };
    }
    // ============= AUDIENCES =============
    async getAudiences(params) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/googleAds:searchStream`), {
            query: `
          SELECT
            user_list.id,
            user_list.name,
            user_list.description,
            user_list.membership_status,
            user_list.size_for_display,
            user_list.type
          FROM user_list
          LIMIT ${params?.limit || 100}
        `,
        }, { headers: this.getHeaders() });
        return (response[0]?.results || []).map((result) => ({
            id: result.userList?.id?.toString(),
            name: result.userList?.name,
            description: result.userList?.description,
            subtype: result.userList?.type,
        }));
    }
    async getAudience(audienceId) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/googleAds:searchStream`), {
            query: `
          SELECT
            user_list.id,
            user_list.name,
            user_list.description,
            user_list.membership_status,
            user_list.size_for_display,
            user_list.type
          FROM user_list
          WHERE user_list.id = ${audienceId}
        `,
        }, { headers: this.getHeaders() });
        const result = response[0]?.results?.[0] || {};
        return {
            id: result.userList?.id?.toString(),
            name: result.userList?.name,
            description: result.userList?.description,
            subtype: result.userList?.type,
        };
    }
    async createAudience(params) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/userLists:mutate`), {
            operations: [
                {
                    create: {
                        name: params.name,
                        description: params.description,
                        membershipStatus: "OPEN",
                        membershipLifeSpan: 30,
                        basicUserList: {},
                    },
                },
            ],
        }, { headers: this.getHeaders() });
        const resourceName = response.results?.[0]?.resourceName;
        const userListId = resourceName?.split("/").pop();
        return { id: userListId, ...params };
    }
    async updateAudience(audienceId, params) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const resourceName = `customers/${customerId}/userLists/${audienceId}`;
        const updateMask = [];
        const updateData = { resourceName };
        if (params.name) {
            updateData.name = params.name;
            updateMask.push("name");
        }
        if (params.description) {
            updateData.description = params.description;
            updateMask.push("description");
        }
        await this.makeRequest("POST", this.getUrl(`customers/${customerId}/userLists:mutate`), {
            operations: [
                {
                    update: updateData,
                    updateMask: updateMask.join(","),
                },
            ],
        }, { headers: this.getHeaders() });
        return this.getAudience(audienceId);
    }
    async deleteAudience(audienceId) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const resourceName = `customers/${customerId}/userLists/${audienceId}`;
        await this.makeRequest("POST", this.getUrl(`customers/${customerId}/userLists:mutate`), {
            operations: [
                {
                    remove: resourceName,
                },
            ],
        }, { headers: this.getHeaders() });
        return { success: true };
    }
    // ============= INSIGHTS =============
    async getAccountInsights(params) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const dateRange = this.getDateRange(params);
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/googleAds:searchStream`), {
            query: `
          SELECT
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.ctr,
            metrics.average_cpc,
            metrics.average_cpm
          FROM customer
          WHERE segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
        `,
        }, { headers: this.getHeaders() });
        const metrics = response[0]?.results?.[0]?.metrics || {};
        return {
            account_id: customerId,
            platform: this.platform,
            date_range: dateRange,
            summary: {
                impressions: parseInt(metrics.impressions || "0", 10),
                clicks: parseInt(metrics.clicks || "0", 10),
                spend: metrics.costMicros
                    ? parseInt(metrics.costMicros, 10) / 1000000
                    : 0,
                conversions: parseFloat(metrics.conversions || "0"),
                ctr: parseFloat(metrics.ctr || "0") * 100,
                cpc: metrics.averageCpc
                    ? parseInt(metrics.averageCpc, 10) / 1000000
                    : 0,
                cpm: metrics.averageCpm
                    ? parseInt(metrics.averageCpm, 10) / 1000000
                    : 0,
            },
        };
    }
    async getCampaignInsights(campaignId, params) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const dateRange = this.getDateRange(params);
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/googleAds:searchStream`), {
            query: `
          SELECT
            campaign.id,
            campaign.name,
            segments.date,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.ctr,
            metrics.average_cpc
          FROM campaign
          WHERE campaign.id = ${campaignId}
            AND segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
        `,
        }, { headers: this.getHeaders() });
        return (response[0]?.results || []).map((result) => ({
            campaign_id: result.campaign?.id?.toString(),
            campaign_name: result.campaign?.name,
            date_start: result.segments?.date,
            date_stop: result.segments?.date,
            impressions: parseInt(result.metrics?.impressions || "0", 10),
            clicks: parseInt(result.metrics?.clicks || "0", 10),
            spend: result.metrics?.costMicros
                ? parseInt(result.metrics.costMicros, 10) / 1000000
                : 0,
            conversions: parseFloat(result.metrics?.conversions || "0"),
            ctr: parseFloat(result.metrics?.ctr || "0") * 100,
            cpc: result.metrics?.averageCpc
                ? parseInt(result.metrics.averageCpc, 10) / 1000000
                : 0,
        }));
    }
    async getAdSetInsights(adSetId, params) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const dateRange = this.getDateRange(params);
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/googleAds:searchStream`), {
            query: `
          SELECT
            ad_group.id,
            ad_group.name,
            segments.date,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.ctr,
            metrics.average_cpc
          FROM ad_group
          WHERE ad_group.id = ${adSetId}
            AND segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
        `,
        }, { headers: this.getHeaders() });
        return (response[0]?.results || []).map((result) => ({
            adset_id: result.adGroup?.id?.toString(),
            adset_name: result.adGroup?.name,
            date_start: result.segments?.date,
            date_stop: result.segments?.date,
            impressions: parseInt(result.metrics?.impressions || "0", 10),
            clicks: parseInt(result.metrics?.clicks || "0", 10),
            spend: result.metrics?.costMicros
                ? parseInt(result.metrics.costMicros, 10) / 1000000
                : 0,
            conversions: parseFloat(result.metrics?.conversions || "0"),
            ctr: parseFloat(result.metrics?.ctr || "0") * 100,
            cpc: result.metrics?.averageCpc
                ? parseInt(result.metrics.averageCpc, 10) / 1000000
                : 0,
        }));
    }
    async getAdInsights(adId, params) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const dateRange = this.getDateRange(params);
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/googleAds:searchStream`), {
            query: `
          SELECT
            ad_group_ad.ad.id,
            segments.date,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.ctr,
            metrics.average_cpc
          FROM ad_group_ad
          WHERE ad_group_ad.ad.id = ${adId}
            AND segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
        `,
        }, { headers: this.getHeaders() });
        return (response[0]?.results || []).map((result) => ({
            ad_id: result.adGroupAd?.ad?.id?.toString(),
            date_start: result.segments?.date,
            date_stop: result.segments?.date,
            impressions: parseInt(result.metrics?.impressions || "0", 10),
            clicks: parseInt(result.metrics?.clicks || "0", 10),
            spend: result.metrics?.costMicros
                ? parseInt(result.metrics.costMicros, 10) / 1000000
                : 0,
            conversions: parseFloat(result.metrics?.conversions || "0"),
            ctr: parseFloat(result.metrics?.ctr || "0") * 100,
            cpc: result.metrics?.averageCpc
                ? parseInt(result.metrics.averageCpc, 10) / 1000000
                : 0,
        }));
    }
    async getInsights(params) {
        const customerId = this.formatCustomerId(this.config.adAccountId);
        const dateRange = this.getDateRange(params);
        const level = params.level || "campaign";
        let query;
        switch (level) {
            case "adset":
                query = `
          SELECT
            ad_group.id,
            ad_group.name,
            ad_group.campaign,
            segments.date,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.ctr,
            metrics.average_cpc
          FROM ad_group
          WHERE segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
          LIMIT ${params.limit || 100}
        `;
                break;
            case "ad":
                query = `
          SELECT
            ad_group_ad.ad.id,
            ad_group_ad.ad_group,
            segments.date,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.ctr,
            metrics.average_cpc
          FROM ad_group_ad
          WHERE segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
          LIMIT ${params.limit || 100}
        `;
                break;
            default:
                query = `
          SELECT
            campaign.id,
            campaign.name,
            segments.date,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.ctr,
            metrics.average_cpc
          FROM campaign
          WHERE segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
          LIMIT ${params.limit || 100}
        `;
        }
        const response = await this.makeRequest("POST", this.getUrl(`customers/${customerId}/googleAds:searchStream`), { query }, { headers: this.getHeaders() });
        return (response[0]?.results || []).map((result) => this.parseGoogleInsights(result, level));
    }
    parseGoogleInsights(result, level) {
        const metrics = result.metrics || {};
        return {
            date_start: result.segments?.date,
            date_stop: result.segments?.date,
            campaign_id: result.campaign?.id?.toString(),
            campaign_name: result.campaign?.name,
            adset_id: result.adGroup?.id?.toString(),
            adset_name: result.adGroup?.name,
            ad_id: result.adGroupAd?.ad?.id?.toString(),
            impressions: parseInt(metrics.impressions || "0", 10),
            clicks: parseInt(metrics.clicks || "0", 10),
            spend: metrics.costMicros
                ? parseInt(metrics.costMicros, 10) / 1000000
                : 0,
            conversions: parseFloat(metrics.conversions || "0"),
            ctr: parseFloat(metrics.ctr || "0") * 100,
            cpc: metrics.averageCpc ? parseInt(metrics.averageCpc, 10) / 1000000 : 0,
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
            case "last_14d":
                since.setDate(since.getDate() - 14);
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
exports.GoogleAdsClient = GoogleAdsClient;
