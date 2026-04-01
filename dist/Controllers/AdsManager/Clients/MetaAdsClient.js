"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaAdsClient = void 0;
// MetaAdsClient.ts - Fixed and completed
const AdPlatformClient_1 = require("./AdPlatformClient");
const ads_1 = require("../../../Types/ads");
class MetaAdsClient extends AdPlatformClient_1.AdPlatformClient {
    constructor(config) {
        super(config);
        this.platform = ads_1.AdsPlatform.META;
        this.baseUrl = 'https://graph.facebook.com';
        this.apiVersion = config.apiVersion || 'v23.0';
    }
    getUrl(endpoint) {
        return `${this.baseUrl}/${this.apiVersion}/${endpoint}`;
    }
    getHeaders() {
        return {
            Authorization: `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
        };
    }
    // ============= AD ACCOUNTS =============
    async getAdAccounts() {
        const response = await this.makeRequest('GET', this.getUrl('me/adaccounts'), null, {
            headers: this.getHeaders(),
            params: {
                fields: 'id,name,account_status,currency,timezone_name,business,amount_spent',
            },
        });
        return (response.data || []).map((account) => ({
            id: account.id,
            name: account.name,
            currency: account.currency,
            timezone: account.timezone_name,
            status: this.mapAccountStatus(account.account_status),
            platform: this.platform,
            businessId: account.business?.id,
            amountSpent: account.amount_spent,
        }));
    }
    async getAdAccount(accountId) {
        const response = await this.makeRequest('GET', this.getUrl(accountId), null, {
            headers: this.getHeaders(),
            params: {
                fields: 'id,name,account_status,currency,timezone_name,business,amount_spent,balance',
            },
        });
        return {
            id: response.id,
            name: response.name,
            currency: response.currency,
            timezone: response.timezone_name,
            status: this.mapAccountStatus(response.account_status),
            platform: this.platform,
            businessId: response.business?.id,
        };
    }
    mapAccountStatus(status) {
        const statusMap = {
            1: 'ACTIVE',
            2: 'DISABLED',
            3: 'UNSETTLED',
            7: 'PENDING_RISK_REVIEW',
            8: 'PENDING_SETTLEMENT',
            9: 'IN_GRACE_PERIOD',
            100: 'PENDING_CLOSURE',
            101: 'CLOSED',
            201: 'ANY_ACTIVE',
            202: 'ANY_CLOSED',
        };
        return statusMap[status] || 'UNKNOWN';
    }
    // ============= CAMPAIGNS =============
    async getCampaigns(params) {
        const response = await this.makeRequest('GET', this.getUrl(`${this.config.adAccountId}/campaigns`), null, {
            headers: this.getHeaders(),
            params: {
                fields: 'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time,special_ad_categories',
                limit: params?.limit || 100,
                ...(params?.status && {
                    filtering: JSON.stringify([
                        { field: 'status', operator: 'IN', value: [params.status] },
                    ]),
                }),
            },
        });
        return (response.data || []).map((campaign) => ({
            id: campaign.id,
            name: campaign.name,
            objective: campaign.objective,
            status: campaign.status,
            daily_budget: campaign.daily_budget ? parseInt(campaign.daily_budget, 10) / 100 : undefined,
            lifetime_budget: campaign.lifetime_budget
                ? parseInt(campaign.lifetime_budget, 10) / 100
                : undefined,
            start_time: campaign.start_time,
            end_time: campaign.stop_time,
            special_ad_categories: campaign.special_ad_categories,
        }));
    }
    async getCampaign(campaignId) {
        const response = await this.makeRequest('GET', this.getUrl(campaignId), null, {
            headers: this.getHeaders(),
            params: {
                fields: 'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time,special_ad_categories,buying_type',
            },
        });
        return {
            id: response.id,
            name: response.name,
            objective: response.objective,
            status: response.status,
            daily_budget: response.daily_budget ? parseInt(response.daily_budget, 10) / 100 : undefined,
            lifetime_budget: response.lifetime_budget
                ? parseInt(response.lifetime_budget, 10) / 100
                : undefined,
            start_time: response.start_time,
            end_time: response.stop_time,
            special_ad_categories: response.special_ad_categories,
            buying_type: response.buying_type,
        };
    }
    async createCampaign(params) {
        const response = await this.makeRequest('POST', this.getUrl(`${this.config.adAccountId}/campaigns`), {
            name: params.name,
            objective: params.objective,
            status: params.status || 'PAUSED',
            special_ad_categories: params.special_ad_categories || [],
            ...(params.daily_budget && {
                daily_budget: Math.round(params.daily_budget * 100),
            }),
            ...(params.lifetime_budget && {
                lifetime_budget: Math.round(params.lifetime_budget * 100),
            }),
            ...(params.start_time && {
                start_time: this.formatDateForApi(params.start_time),
            }),
            ...(params.end_time && {
                stop_time: this.formatDateForApi(params.end_time),
            }),
        }, { headers: this.getHeaders() });
        return { id: response.id, ...params };
    }
    async updateCampaign(campaignId, params) {
        await this.makeRequest('POST', this.getUrl(campaignId), {
            ...(params.name && { name: params.name }),
            ...(params.status && { status: params.status }),
            ...(params.daily_budget && {
                daily_budget: Math.round(params.daily_budget * 100),
            }),
            ...(params.lifetime_budget && {
                lifetime_budget: Math.round(params.lifetime_budget * 100),
            }),
            ...(params.end_time && {
                stop_time: this.formatDateForApi(params.end_time),
            }),
        }, { headers: this.getHeaders() });
        return this.getCampaign(campaignId);
    }
    async deleteCampaign(campaignId) {
        await this.makeRequest('DELETE', this.getUrl(campaignId), null, {
            headers: this.getHeaders(),
        });
        return { success: true };
    }
    // ============= AD SETS =============
    async getAdSets(campaignId, params) {
        const endpoint = campaignId ? `${campaignId}/adsets` : `${this.config.adAccountId}/adsets`;
        const response = await this.makeRequest('GET', this.getUrl(endpoint), null, {
            headers: this.getHeaders(),
            params: {
                fields: 'id,name,campaign_id,status,daily_budget,lifetime_budget,start_time,end_time,billing_event,optimization_goal,bid_amount,targeting',
                limit: params?.limit || 100,
                ...(params?.status && {
                    filtering: JSON.stringify([{ field: 'status', operator: 'IN', value: [params.status] }]),
                }),
            },
        });
        return (response.data || []).map((adset) => ({
            id: adset.id,
            name: adset.name,
            campaign_id: adset.campaign_id,
            status: adset.status,
            daily_budget: adset.daily_budget ? parseInt(adset.daily_budget, 10) / 100 : undefined,
            lifetime_budget: adset.lifetime_budget
                ? parseInt(adset.lifetime_budget, 10) / 100
                : undefined,
            start_time: adset.start_time,
            end_time: adset.end_time,
            billing_event: adset.billing_event,
            optimization_goal: adset.optimization_goal,
            bid_amount: adset.bid_amount ? parseInt(adset.bid_amount, 10) / 100 : undefined,
            targeting: adset.targeting,
        }));
    }
    async getAdSet(adSetId) {
        const response = await this.makeRequest('GET', this.getUrl(adSetId), null, {
            headers: this.getHeaders(),
            params: {
                fields: 'id,name,campaign_id,status,daily_budget,lifetime_budget,start_time,end_time,billing_event,optimization_goal,bid_amount,targeting',
            },
        });
        return {
            id: response.id,
            name: response.name,
            campaign_id: response.campaign_id,
            status: response.status,
            daily_budget: response.daily_budget ? parseInt(response.daily_budget, 10) / 100 : undefined,
            lifetime_budget: response.lifetime_budget
                ? parseInt(response.lifetime_budget, 10) / 100
                : undefined,
            start_time: response.start_time,
            end_time: response.end_time,
            billing_event: response.billing_event,
            optimization_goal: response.optimization_goal,
            bid_amount: response.bid_amount ? parseInt(response.bid_amount, 10) / 100 : undefined,
            targeting: response.targeting,
        };
    }
    async createAdSet(params) {
        const response = await this.makeRequest('POST', this.getUrl(`${this.config.adAccountId}/adsets`), {
            name: params.name,
            campaign_id: params.campaign_id,
            status: params.status || 'PAUSED',
            billing_event: params.billing_event || 'IMPRESSIONS',
            optimization_goal: params.optimization_goal || 'REACH',
            targeting: params.targeting || { geo_locations: { countries: ['US'] } },
            ...(params.daily_budget && {
                daily_budget: Math.round(params.daily_budget * 100),
            }),
            ...(params.lifetime_budget && {
                lifetime_budget: Math.round(params.lifetime_budget * 100),
            }),
            ...(params.start_time && {
                start_time: this.formatDateForApi(params.start_time),
            }),
            ...(params.end_time && {
                end_time: this.formatDateForApi(params.end_time),
            }),
            ...(params.bid_amount && {
                bid_amount: Math.round(params.bid_amount * 100),
            }),
        }, { headers: this.getHeaders() });
        return { id: response.id, ...params };
    }
    async updateAdSet(adSetId, params) {
        await this.makeRequest('POST', this.getUrl(adSetId), {
            ...(params.name && { name: params.name }),
            ...(params.status && { status: params.status }),
            ...(params.daily_budget && {
                daily_budget: Math.round(params.daily_budget * 100),
            }),
            ...(params.lifetime_budget && {
                lifetime_budget: Math.round(params.lifetime_budget * 100),
            }),
            ...(params.end_time && {
                end_time: this.formatDateForApi(params.end_time),
            }),
            ...(params.bid_amount && {
                bid_amount: Math.round(params.bid_amount * 100),
            }),
            ...(params.targeting && { targeting: params.targeting }),
        }, { headers: this.getHeaders() });
        return this.getAdSet(adSetId);
    }
    async deleteAdSet(adSetId) {
        await this.makeRequest('DELETE', this.getUrl(adSetId), null, {
            headers: this.getHeaders(),
        });
        return { success: true };
    }
    // ============= ADS =============
    async getAds(adSetId, params) {
        const endpoint = adSetId ? `${adSetId}/ads` : `${this.config.adAccountId}/ads`;
        const response = await this.makeRequest('GET', this.getUrl(endpoint), null, {
            headers: this.getHeaders(),
            params: {
                fields: 'id,name,adset_id,status,creative{id,name,title,body,image_url,video_id}',
                limit: params?.limit || 100,
                ...(params?.status && {
                    filtering: JSON.stringify([{ field: 'status', operator: 'IN', value: [params.status] }]),
                }),
            },
        });
        return (response.data || []).map((ad) => ({
            id: ad.id,
            name: ad.name,
            adset_id: ad.adset_id,
            status: ad.status,
            creative: ad.creative,
        }));
    }
    async getAd(adId) {
        const response = await this.makeRequest('GET', this.getUrl(adId), null, {
            headers: this.getHeaders(),
            params: {
                fields: 'id,name,adset_id,status,creative{id,name,title,body,image_url,video_id,object_story_spec}',
            },
        });
        return {
            id: response.id,
            name: response.name,
            adset_id: response.adset_id,
            status: response.status,
            creative: response.creative,
        };
    }
    async createAd(params) {
        const response = await this.makeRequest('POST', this.getUrl(`${this.config.adAccountId}/ads`), {
            name: params.name,
            adset_id: params.adset_id,
            status: params.status || 'PAUSED',
            creative: params.creative_id ? { creative_id: params.creative_id } : params.creative,
        }, { headers: this.getHeaders() });
        return { id: response.id, ...params };
    }
    async updateAd(adId, params) {
        await this.makeRequest('POST', this.getUrl(adId), {
            ...(params.name && { name: params.name }),
            ...(params.status && { status: params.status }),
            ...(params.creative_id && {
                creative: { creative_id: params.creative_id },
            }),
        }, { headers: this.getHeaders() });
        return this.getAd(adId);
    }
    async deleteAd(adId) {
        await this.makeRequest('DELETE', this.getUrl(adId), null, {
            headers: this.getHeaders(),
        });
        return { success: true };
    }
    // ============= CREATIVES =============
    async getCreatives(params) {
        const response = await this.makeRequest('GET', this.getUrl(`${this.config.adAccountId}/adcreatives`), null, {
            headers: this.getHeaders(),
            params: {
                fields: 'id,name,title,body,image_url,image_hash,video_id,object_story_spec,call_to_action_type',
                limit: params?.limit || 100,
            },
        });
        return response.data || [];
    }
    async getCreative(creativeId) {
        return this.makeRequest('GET', this.getUrl(creativeId), null, {
            headers: this.getHeaders(),
            params: {
                fields: 'id,name,title,body,image_url,image_hash,video_id,object_story_spec,call_to_action_type',
            },
        });
    }
    async createCreative(params) {
        const response = await this.makeRequest('POST', this.getUrl(`${this.config.adAccountId}/adcreatives`), params, { headers: this.getHeaders() });
        return { id: response.id, ...params };
    }
    async updateCreative(creativeId, params) {
        await this.makeRequest('POST', this.getUrl(creativeId), params, {
            headers: this.getHeaders(),
        });
        return this.getCreative(creativeId);
    }
    async deleteCreative(creativeId) {
        await this.makeRequest('DELETE', this.getUrl(creativeId), null, {
            headers: this.getHeaders(),
        });
        return { success: true };
    }
    // ============= AUDIENCES =============
    async getAudiences(params) {
        const response = await this.makeRequest('GET', this.getUrl(`${this.config.adAccountId}/customaudiences`), null, {
            headers: this.getHeaders(),
            params: {
                fields: 'id,name,description,subtype,approximate_count,delivery_status',
                limit: params?.limit || 100,
            },
        });
        return response.data || [];
    }
    async getAudience(audienceId) {
        return this.makeRequest('GET', this.getUrl(audienceId), null, {
            headers: this.getHeaders(),
            params: {
                fields: 'id,name,description,subtype,approximate_count,delivery_status,rule',
            },
        });
    }
    async createAudience(params) {
        const response = await this.makeRequest('POST', this.getUrl(`${this.config.adAccountId}/customaudiences`), {
            name: params.name,
            description: params.description,
            subtype: params.subtype || 'CUSTOM',
            customer_file_source: params.customer_file_source,
            rule: params.rule,
        }, { headers: this.getHeaders() });
        return { id: response.id, ...params };
    }
    async updateAudience(audienceId, params) {
        await this.makeRequest('POST', this.getUrl(audienceId), params, {
            headers: this.getHeaders(),
        });
        return this.getAudience(audienceId);
    }
    async deleteAudience(audienceId) {
        await this.makeRequest('DELETE', this.getUrl(audienceId), null, {
            headers: this.getHeaders(),
        });
        return { success: true };
    }
    // ============= INSIGHTS =============
    async getAccountInsights(params) {
        const response = await this.makeRequest('GET', this.getUrl(`${this.config.adAccountId}/insights`), null, {
            headers: this.getHeaders(),
            params: {
                fields: 'impressions,clicks,spend,reach,cpm,cpc,ctr,frequency,actions',
                date_preset: params.date_preset || 'last_30d',
                ...(params.time_range && {
                    time_range: JSON.stringify(params.time_range),
                }),
            },
        });
        const data = response.data?.[0] || {};
        return {
            account_id: this.config.adAccountId,
            platform: this.platform,
            date_range: {
                since: data.date_start || params.time_range?.since || '',
                until: data.date_stop || params.time_range?.until || '',
            },
            summary: {
                impressions: parseInt(data.impressions || '0', 10),
                clicks: parseInt(data.clicks || '0', 10),
                spend: parseFloat(data.spend || '0'),
                reach: parseInt(data.reach || '0', 10),
                ctr: parseFloat(data.ctr || '0'),
                cpm: parseFloat(data.cpm || '0'),
                cpc: parseFloat(data.cpc || '0'),
            },
        };
    }
    async getCampaignInsights(campaignId, params) {
        const response = await this.makeRequest('GET', this.getUrl(`${campaignId}/insights`), null, {
            headers: this.getHeaders(),
            params: {
                fields: 'campaign_id,campaign_name,impressions,clicks,spend,reach,cpm,cpc,ctr,frequency,actions',
                date_preset: params.date_preset || 'last_30d',
                ...(params.time_range && {
                    time_range: JSON.stringify(params.time_range),
                }),
                ...(params.breakdowns && { breakdowns: params.breakdowns.join(',') }),
                level: 'campaign',
            },
        });
        return (response.data || []).map((item) => this.parseInsightsResponse(item));
    }
    async getAdSetInsights(adSetId, params) {
        const response = await this.makeRequest('GET', this.getUrl(`${adSetId}/insights`), null, {
            headers: this.getHeaders(),
            params: {
                fields: 'adset_id,adset_name,impressions,clicks,spend,reach,cpm,cpc,ctr,frequency,actions',
                date_preset: params.date_preset || 'last_30d',
                ...(params.time_range && {
                    time_range: JSON.stringify(params.time_range),
                }),
                ...(params.breakdowns && { breakdowns: params.breakdowns.join(',') }),
                level: 'adset',
            },
        });
        return (response.data || []).map((item) => this.parseInsightsResponse(item));
    }
    async getAdInsights(adId, params) {
        const response = await this.makeRequest('GET', this.getUrl(`${adId}/insights`), null, {
            headers: this.getHeaders(),
            params: {
                fields: 'ad_id,ad_name,impressions,clicks,spend,reach,cpm,cpc,ctr,frequency,actions',
                date_preset: params.date_preset || 'last_30d',
                ...(params.time_range && {
                    time_range: JSON.stringify(params.time_range),
                }),
                ...(params.breakdowns && { breakdowns: params.breakdowns.join(',') }),
                level: 'ad',
            },
        });
        return (response.data || []).map((item) => this.parseInsightsResponse(item));
    }
    async getInsights(params) {
        const response = await this.makeRequest('GET', this.getUrl(`${this.config.adAccountId}/insights`), null, {
            headers: this.getHeaders(),
            params: {
                fields: 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,reach,cpm,cpc,ctr,frequency,actions',
                date_preset: params.date_preset || 'last_30d',
                ...(params.time_range && {
                    time_range: JSON.stringify(params.time_range),
                }),
                ...(params.breakdowns && { breakdowns: params.breakdowns.join(',') }),
                level: params.level || 'account',
                limit: params.limit || 100,
            },
        });
        return (response.data || []).map((item) => this.parseInsightsResponse(item));
    }
}
exports.MetaAdsClient = MetaAdsClient;
