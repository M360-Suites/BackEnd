"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrafficData = exports.SeoCredModel = exports.KeywordRanking = exports.Domain = exports.Backlink = exports.Audit = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const credSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Types.ObjectId,
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
}, { timestamps: true });
const DomainSchema = new mongoose_1.Schema({
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const BacklinkSchema = new mongoose_1.Schema({
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    domainId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const TrafficDataSchema = new mongoose_1.Schema({
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    domainId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const AuditSchema = new mongoose_1.Schema({
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.Mixed,
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
}, {
    timestamps: true,
});
// Index for faster queries
AuditSchema.index({ organizationId: 1, createdAt: -1 });
AuditSchema.index({ status: 1, startedAt: 1 });
const KeywordRankingSchema = new mongoose_1.Schema({
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const KeywordRanking = mongoose_1.default.model('KeywordRanking', KeywordRankingSchema);
exports.KeywordRanking = KeywordRanking;
const Audit = mongoose_1.default.model('Audit', AuditSchema);
exports.Audit = Audit;
const TrafficData = mongoose_1.default.model('TrafficData', TrafficDataSchema);
exports.TrafficData = TrafficData;
const Backlink = mongoose_1.default.model('Backlink', BacklinkSchema);
exports.Backlink = Backlink;
const Domain = mongoose_1.default.model('Domain', DomainSchema);
exports.Domain = Domain;
const SeoCredModel = (0, mongoose_1.model)("SeoCred", credSchema);
exports.SeoCredModel = SeoCredModel;
