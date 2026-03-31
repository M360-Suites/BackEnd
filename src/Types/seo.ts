export interface SEOConfig {
  microsoftClarity: {
    projectId: string;
    apiKey: string;
  };
  googleAnalytics: {
    propertyId: string;
    apiSecret: string;
    measurementId: string;
  };
  pageSpeed: {
    apiKey: string;
  };
  serpTracking: {
    apiKey?: string;
  };
}

export interface PageSpeedMetrics {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  speedIndex: number;
}

export interface SerpRanking {
  keyword: string;
  position: number;
  url: string;
  date: Date;
}

export interface AnalyticsEvent {
  name: string;
  params: Record<string, any>;
}

export interface ClarityData {
  projectId: string;
  sessionId?: string;
  userId?: string;
  pageData?: Record<string, any>;
}

export enum ClarityDimensions {
  Browser = "Browser",
  Device = "Device",
  "Country/Region" = "Country/Region",
  OS = "OS",
  Source = "Source",
  Medium = "Medium",
  Campaign = "Campaign",
  Channel = "Channel",
  URL = "URL",
}
