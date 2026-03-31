import { Document, Types } from "mongoose";

// ENUMS
export enum AdsPlatform {
  META = "meta",
  GOOGLE = "google",
  TWITTER = "twitter",
  LINKEDIN = "linkedin",
  TIKTOK = "tiktok",
  SNAPCHAT = "snapchat",
}

export enum CampaignStatus {
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  DELETED = "DELETED",
  ARCHIVED = "ARCHIVED",
}

export enum CampaignObjective {
  AWARENESS = "AWARENESS",
  TRAFFIC = "TRAFFIC",
  ENGAGEMENT = "ENGAGEMENT",
  LEADS = "LEADS",
  APP_PROMOTION = "APP_PROMOTION",
  SALES = "SALES",
  CONVERSIONS = "CONVERSIONS",
  VIDEO_VIEWS = "VIDEO_VIEWS",
  REACH = "REACH",
  BRAND_AWARENESS = "BRAND_AWARENESS",
}

// ============= AD PLATFORM CONFIG =============
export interface AdPlatformConfig {
  accessToken: string;
  adAccountId: string;
  apiVersion?: string;
  [key: string]: any;
}

export interface MetaAdsConfig extends AdPlatformConfig {
  apiVersion: string;
}

export interface GoogleAdsConfig extends AdPlatformConfig {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  loginCustomerId?: string;
}

export interface TwitterAdsConfig extends AdPlatformConfig {
  consumerKey: string;
  consumerSecret: string;
  accessTokenSecret: string;
  fundingInstrumentId?: string;
}

export interface LinkedInAdsConfig extends AdPlatformConfig {
  organizationId: string;
}

export interface TikTokAdsConfig extends AdPlatformConfig {
  pixelId?: string;
  appId?: string;
}

export interface SnapchatAdsConfig extends AdPlatformConfig {
  organizationId: string;
}

// ============= AD ACCOUNT =============
export interface AdAccount {
  id: string;
  name: string;
  currency?: string;
  timezone?: string;
  status?: string;
  platform: AdsPlatform;
  businessId?: string;
  [key: string]: any;
}

// ============= CAMPAIGN =============
export interface Campaign {
  id?: string;
  name: string;
  objective: string;
  status?: string;
  special_ad_categories?: string[];
  buying_type?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  start_time?: string | Date;
  end_time?: string | Date;
  bid_strategy?: string;
  [key: string]: any;
}

export interface CampaignCreateParams {
  name: string;
  objective: string;
  status?: string;
  special_ad_categories?: string[];
  daily_budget?: number;
  lifetime_budget?: number;
  start_time?: string | Date;
  end_time?: string | Date;
  [key: string]: any;
}

export interface CampaignUpdateParams {
  name?: string;
  status?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  end_time?: string | Date;
  [key: string]: any;
}

// ============= AD SET / AD GROUP =============
export interface AdSet {
  id?: string;
  name: string;
  campaign_id: string;
  daily_budget?: number;
  lifetime_budget?: number;
  start_time?: string | Date;
  end_time?: string | Date;
  billing_event?: string;
  optimization_goal?: string;
  bid_amount?: number;
  bid_strategy?: string;
  targeting?: TargetingSpec;
  status?: string;
  [key: string]: any;
}

export interface AdSetCreateParams {
  name: string;
  campaign_id: string;
  daily_budget?: number;
  lifetime_budget?: number;
  start_time?: string | Date;
  end_time?: string | Date;
  billing_event?: string;
  optimization_goal?: string;
  bid_amount?: number;
  targeting?: TargetingSpec;
  status?: string;
  [key: string]: any;
}

export interface AdSetUpdateParams {
  name?: string;
  status?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  end_time?: string | Date;
  bid_amount?: number;
  targeting?: TargetingSpec;
  [key: string]: any;
}

// ============= TARGETING =============
export interface TargetingSpec {
  age_min?: number;
  age_max?: number;
  genders?: number[];
  geo_locations?: {
    countries?: string[];
    regions?: Array<{ key: string }>;
    cities?: Array<{ key: string; radius?: number; distance_unit?: string }>;
    zips?: Array<{ key: string }>;
  };
  interests?: Array<{ id: string; name?: string }>;
  behaviors?: Array<{ id: string; name?: string }>;
  custom_audiences?: Array<{ id: string }>;
  excluded_custom_audiences?: Array<{ id: string }>;
  locales?: number[];
  device_platforms?: string[];
  publisher_platforms?: string[];
  facebook_positions?: string[];
  instagram_positions?: string[];
  [key: string]: any;
}

// ============= AD CREATIVE =============
export interface AdCreative {
  id?: string;
  name?: string;
  title?: string;
  body?: string;
  call_to_action_type?: string;
  image_url?: string;
  image_hash?: string;
  video_id?: string;
  link_url?: string;
  object_story_spec?: {
    page_id?: string;
    link_data?: {
      link: string;
      message?: string;
      description?: string;
      caption?: string;
      image_url?: string;
      image_hash?: string;
      call_to_action?: {
        type: string;
        value?: { link?: string };
      };
    };
    video_data?: {
      video_id: string;
      title?: string;
      message?: string;
      call_to_action?: {
        type: string;
        value?: { link?: string };
      };
    };
  };
  [key: string]: any;
}

export interface AdCreativeCreateParams {
  name: string;
  title?: string;
  body?: string;
  call_to_action_type?: string;
  image_url?: string;
  image_hash?: string;
  video_id?: string;
  link_url?: string;
  object_story_spec?: AdCreative['object_story_spec'];
  [key: string]: any;
}

// ============= AD =============
export interface Ad {
  id?: string;
  name: string;
  adset_id: string;
  creative_id?: string;
  creative?: AdCreative;
  status?: string;
  tracking_specs?: any;
  [key: string]: any;
}

export interface AdCreateParams {
  name: string;
  adset_id: string;
  creative_id?: string;
  creative?: AdCreative;
  status?: string;
  tracking_specs?: any;
  [key: string]: any;
}

export interface AdUpdateParams {
  name?: string;
  status?: string;
  creative_id?: string;
  [key: string]: any;
}

// ============= AUDIENCE =============
export interface Audience {
  id?: string;
  name: string;
  description?: string;
  subtype?: string;
  customer_file_source?: string;
  rule?: any;
  lookalike_spec?: {
    origin_id: string;
    ratio: number;
    country: string;
  };
  [key: string]: any;
}

export interface AudienceCreateParams {
  name: string;
  description?: string;
  subtype?: string;
  customer_file_source?: string;
  rule?: any;
  [key: string]: any;
}


// ============= INSIGHTS / ANALYTICS =============
export interface InsightsParams {
  date_preset?: string;
  time_range?: {
    since: string;
    until: string;
  };
  level?: 'account' | 'campaign' | 'adset' | 'ad';
  breakdowns?: string[];
  fields?: string[];
  filtering?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  sort?: string[];
  limit?: number;
  [key: string]: any;
}

export interface InsightsResult {
  date_start?: string;
  date_stop?: string;
  account_id?: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  impressions: number;
  clicks: number;
  spend: number;
  reach?: number;
  frequency?: number;
  cpm?: number;
  cpc?: number;
  ctr?: number;
  conversions?: number;
  conversion_rate?: number;
  cost_per_conversion?: number;
  actions?: Array<{ action_type: string; value: number }>;
  video_views?: number;
  video_p25_watched?: number;
  video_p50_watched?: number;
  video_p75_watched?: number;
  video_p100_watched?: number;
  [key: string]: any;
}

export interface AccountInsights {
  account_id: string;
  account_name?: string;
  platform: AdsPlatform;
  date_range: {
    since: string;
    until: string;
  };
  summary: {
    impressions: number;
    clicks: number;
    spend: number;
    reach?: number;
    ctr?: number;
    cpm?: number;
    cpc?: number;
    conversions?: number;
  };
  campaigns?: InsightsResult[];
}

// ============= CONNECTION / AUTH =============
export interface AdsConnection extends Document {
  orgId: Types.ObjectId;
  platform: AdsPlatform;
  accessToken: string;
  refreshToken?: string;
  accessTokenSecret?: string;
  expiresAt?: Date;
  refreshExpiresAt?: Date;
  accountId: string;
  accountName: string;
  adAccounts?: AdAccount[];
  scopes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AdOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
  refreshUrl?: string;
}

// ============= API RESPONSES =============
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
}

export interface PaginatedResponse<T = any> {
  data: T[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
  summary?: {
    total_count?: number;
  };
}