import mongoose, { Document, model, Schema, Types } from "mongoose";
import { ClarityData, SEOConfig } from "../Types/seo";

const credSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    microsoftClarity: {
      projectId: String,
      apiKey: String,
    },
    googleAnalytics: {
      propertyId: String,
      apiSecret: String,
      measurementId: String,
    },
    pageSpeed: {
      apiKey: String,
    },
    serpTracking: {
      apiKey: String,
    },
    url: String,
  },
  { timestamps: true }
);

// Domain Model

export interface IDomain extends Document {
  organizationId: mongoose.Types.ObjectId;
  url: string;
  name: string;
  verified: boolean;
  verificationCode?: string;
  lastCrawled: Date;
  
  // Basic metrics (cached)
  metrics: {
    domainAuthority: number;
    pageAuthority: number;
    backlinks: number;
    referringDomains: number;
    organicKeywords: number;
    organicTraffic: number;
  };
  
  // Tracking preferences
  tracking: {
    keywords: string[];
    competitors: string[];
    frequency: 'daily' | 'weekly' | 'monthly';
    lastTracked: Date;
  };
  
  // Status
  status: 'active' | 'inactive' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

const DomainSchema = new Schema({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  url: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String
  },
  lastCrawled: {
    type: Date
  },
  metrics: {
    domainAuthority: { type: Number, default: 0 },
    pageAuthority: { type: Number, default: 0 },
    backlinks: { type: Number, default: 0 },
    referringDomains: { type: Number, default: 0 },
    organicKeywords: { type: Number, default: 0 },
    organicTraffic: { type: Number, default: 0 }
  },
  tracking: {
    keywords: [{ type: String }],
    competitors: [{ type: String }],
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    lastTracked: { type: Date }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Indexes for faster queries
DomainSchema.index({ organizationId: 1, url: 1 }, { unique: true });
DomainSchema.index({ 'tracking.lastTracked': 1 });

// BACKLINK MODEL
export interface IBacklink extends Document {
  organizationId: mongoose.Types.ObjectId;
  domainId: mongoose.Types.ObjectId;
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  followType: 'dofollow' | 'nofollow';
  domainRating: number;
  urlRating: number;
  traffic: number;
  firstSeen: Date;
  lastSeen: Date;
  isLost: boolean;
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BacklinkSchema = new Schema({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  domainId: {
    type: Schema.Types.ObjectId,
    ref: 'Domain',
    required: true,
    index: true
  },
  sourceUrl: {
    type: String,
    required: true
  },
  targetUrl: {
    type: String,
    required: true
  },
  anchorText: {
    type: String,
    default: ''
  },
  followType: {
    type: String,
    enum: ['dofollow', 'nofollow'],
    default: 'dofollow'
  },
  domainRating: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  urlRating: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  traffic: {
    type: Number,
    default: 0
  },
  firstSeen: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isLost: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    enum: ['editorial', 'guest-post', 'forum', 'blog-comment', 'social', 'directory']
  }],
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes
BacklinkSchema.index({ domainId: 1, sourceUrl: 1 }, { unique: true });
BacklinkSchema.index({ domainId: 1, isLost: 1, lastSeen: 1 });
BacklinkSchema.index({ organizationId: 1, domainRating: -1 });

// TRAFFICDATA MODEL
export interface ITrafficData extends Document {
  organizationId: mongoose.Types.ObjectId;
  domainId: mongoose.Types.ObjectId;
  date: Date;
  
  // Traffic metrics
  sessions: number;
  users: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
  
  // Traffic sources
  organic: number;
  direct: number;
  referral: number;
  social: number;
  email: number;
  paid: number;
  
  // Geography
  topCountries: Array<{
    country: string;
    sessions: number;
    percent: number;
  }>;
  
  // Pages
  topPages: Array<{
    page: string;
    pageviews: number;
    avgTime: number;
  }>;
  
  // Devices
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  
  createdAt: Date;
}

const TrafficDataSchema = new Schema({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  domainId: {
    type: Schema.Types.ObjectId,
    ref: 'Domain',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  sessions: {
    type: Number,
    default: 0
  },
  users: {
    type: Number,
    default: 0
  },
  pageviews: {
    type: Number,
    default: 0
  },
  bounceRate: {
    type: Number,
    default: 0
  },
  avgSessionDuration: {
    type: Number,
    default: 0
  },
  organic: {
    type: Number,
    default: 0
  },
  direct: {
    type: Number,
    default: 0
  },
  referral: {
    type: Number,
    default: 0
  },
  social: {
    type: Number,
    default: 0
  },
  email: {
    type: Number,
    default: 0
  },
  paid: {
    type: Number,
    default: 0
  },
  topCountries: [{
    country: String,
    sessions: Number,
    percent: Number
  }],
  topPages: [{
    page: String,
    pageviews: Number,
    avgTime: Number
  }],
  devices: {
    desktop: { type: Number, default: 0 },
    mobile: { type: Number, default: 0 },
    tablet: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Time-series index
TrafficDataSchema.index({ domainId: 1, date: -1 });
TrafficDataSchema.index({ organizationId: 1, date: -1 });


// AUDIT MODEL
export interface IAudit extends Document {
  organizationId: mongoose.Types.ObjectId;
  url: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  result: any;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AuditSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    result: {
      type: Schema.Types.Mixed,
    },
    error: {
      type: String,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Index for faster queries
AuditSchema.index({ organizationId: 1, createdAt: -1 });
AuditSchema.index({ status: 1, startedAt: 1 });


// KEYWORD MODEL
export interface IKeywordRanking extends Document {
  organizationId: mongoose.Types.ObjectId;
  domain: string;
  keyword: string;
  location: string;
  position: number;
  url: string;
  title: string;
  snippet: string;
  date: Date;
  createdAt: Date;
}

const KeywordRankingSchema = new Schema({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  domain: {
    type: String,
    required: true,
    index: true
  },
  keyword: {
    type: String,
    required: true,
    index: true
  },
  location: {
    type: String,
    default: 'us'
  },
  position: {
    type: Number,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  title: {
    type: String
  },
  snippet: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
KeywordRankingSchema.index({ organizationId: 1, domain: 1, keyword: 1, date: -1 });
KeywordRankingSchema.index({ domain: 1, keyword: 1, position: 1 });


const KeywordRanking = mongoose.model<IKeywordRanking>('KeywordRanking', KeywordRankingSchema);

const Audit = mongoose.model<IAudit>('Audit', AuditSchema);

const TrafficData = mongoose.model<ITrafficData>('TrafficData', TrafficDataSchema);

const Backlink = mongoose.model<IBacklink>('Backlink', BacklinkSchema);

const Domain = mongoose.model<IDomain>('Domain', DomainSchema);

const SeoCredModel = model<SEOConfig>("SeoCred", credSchema);

export { Audit, Backlink, Domain, KeywordRanking, SeoCredModel, TrafficData };
