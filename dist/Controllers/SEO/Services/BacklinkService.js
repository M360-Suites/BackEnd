"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BacklinkService = void 0;
// src/services/BacklinkService.ts
const Providers_1 = require("../Providers");
const SEOModels_1 = require("../../../Models/SEOModels");
class BacklinkService {
    constructor(ahrefsApiKey) {
        this.ahrefs = null;
        if (ahrefsApiKey) {
            this.ahrefs = new Providers_1.AhrefsProvider(ahrefsApiKey);
        }
        this.scraper = new Providers_1.ScraperProvider();
    }
    async scanBacklinks(domainId, organizationId, usePaidAPI = false) {
        const domain = await SEOModels_1.Domain.findOne({
            _id: domainId,
            organizationId
        });
        if (!domain) {
            throw new Error('Domain not found');
        }
        let backlinks = [];
        let metrics = {};
        if (usePaidAPI && this.ahrefs) {
            // Use Ahrefs API
            const [backlinkData, domainMetrics] = await Promise.all([
                this.ahrefs.getBacklinks(domain.url, 'domain', 500),
                this.ahrefs.getDomainMetrics(domain.url)
            ]);
            backlinks = backlinkData.backlinks;
            metrics = domainMetrics;
            // Save to database
            await this.saveAhrefsBacklinks(organizationId, domainId, backlinkData.backlinks);
        }
        else {
            // Use free scraping method (limited)
            backlinks = await this.scrapeBacklinks(domain.url);
            metrics = await this.estimateMetrics(domain.url);
        }
        // Update domain metrics
        await SEOModels_1.Domain.findByIdAndUpdate(domainId, {
            'metrics.domainAuthority': metrics.domain_rating || 0,
            'metrics.pageAuthority': metrics.url_rating || 0,
            'metrics.backlinks': metrics.backlinks || backlinks.length,
            'metrics.referringDomains': metrics.refdomains || 0,
            'lastCrawled': new Date()
        });
        return {
            total: backlinks.length,
            new: await this.countNewBacklinks(domainId, backlinks),
            lost: await this.countLostBacklinks(domainId),
            metrics,
            backlinks: backlinks.slice(0, 50) // Return first 50
        };
    }
    async analyzeBacklinkProfile(domainId) {
        const backlinks = await SEOModels_1.Backlink.find({
            domainId,
            isLost: false
        });
        const analysis = {
            total: backlinks.length,
            byType: {
                dofollow: backlinks.filter(b => b.followType === 'dofollow').length,
                nofollow: backlinks.filter(b => b.followType === 'nofollow').length
            },
            byAuthority: {
                high: backlinks.filter(b => b.domainRating >= 60).length,
                medium: backlinks.filter(b => b.domainRating >= 30 && b.domainRating < 60).length,
                low: backlinks.filter(b => b.domainRating < 30).length
            },
            topReferringDomains: await this.getTopReferringDomains(domainId),
            anchorTextDistribution: await this.getAnchorTextDistribution(domainId),
            timeline: await this.getBacklinkTimeline(domainId)
        };
        return analysis;
    }
    async findCompetitors(domainId) {
        const domain = await SEOModels_1.Domain.findById(domainId);
        if (!domain || !this.ahrefs)
            return [];
        try {
            const competitors = await this.ahrefs.getCompetitors(domain.url);
            // Update domain with competitors
            await SEOModels_1.Domain.findByIdAndUpdate(domainId, {
                'tracking.competitors': competitors.slice(0, 10)
            });
            return competitors.slice(0, 10);
        }
        catch (error) {
            return domain.tracking.competitors || [];
        }
    }
    async monitorBacklinks(domainId) {
        const newBacklinks = await SEOModels_1.Backlink.find({
            domainId,
            isLost: false,
            firstSeen: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }).sort({ firstSeen: -1 }).limit(20);
        const lostBacklinks = await SEOModels_1.Backlink.find({
            domainId,
            isLost: true,
            lastSeen: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }).sort({ lastSeen: -1 }).limit(20);
        return {
            new: newBacklinks,
            lost: lostBacklinks
        };
    }
    async saveAhrefsBacklinks(organizationId, domainId, ahrefsBacklinks) {
        const operations = ahrefsBacklinks.map(bl => ({
            updateOne: {
                filter: {
                    domainId,
                    sourceUrl: bl.url_from
                },
                update: {
                    $set: {
                        organizationId,
                        domainId,
                        sourceUrl: bl.url_from,
                        targetUrl: bl.url_to,
                        anchorText: bl.anchor || '',
                        followType: bl.dofollow ? 'dofollow' : 'nofollow',
                        domainRating: bl.domain_rating || 0,
                        urlRating: bl.url_rating || 0,
                        firstSeen: bl.first_seen ? new Date(bl.first_seen) : new Date(),
                        lastSeen: new Date(),
                        isLost: false
                    }
                },
                upsert: true
            }
        }));
        if (operations.length > 0) {
            await SEOModels_1.Backlink.bulkWrite(operations);
        }
        // Mark backlinks not seen in this scan as lost
        await SEOModels_1.Backlink.updateMany({
            domainId,
            lastSeen: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 days
        }, { $set: { isLost: true } });
    }
    async scrapeBacklinks(domain) {
        // Basic scraping for backlinks (limited)
        // In production, you'd use a proper backlink finder
        return [];
    }
    async estimateMetrics(domain) {
        // Estimate metrics based on domain age, TLD, etc.
        return {
            domain_rating: 0,
            url_rating: 0,
            backlinks: 0,
            refdomains: 0
        };
    }
    async countNewBacklinks(domainId, currentBacklinks) {
        const sourceUrls = currentBacklinks.map(b => b.url_from);
        const existing = await SEOModels_1.Backlink.find({
            domainId,
            sourceUrl: { $in: sourceUrls }
        });
        return currentBacklinks.length - existing.length;
    }
    async countLostBacklinks(domainId) {
        return SEOModels_1.Backlink.countDocuments({
            domainId,
            isLost: true,
            lastSeen: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        });
    }
    async getTopReferringDomains(domainId) {
        const pipeline = [
            { $match: { domainId, isLost: false } },
            {
                $group: {
                    _id: { $toLower: { $arrayElemAt: [{ $split: ['$sourceUrl', '/'] }, 2] } },
                    count: { $sum: 1 },
                    avgDomainRating: { $avg: '$domainRating' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ];
        return []; // Backlink.aggregate(pipeline);
    }
    async getAnchorTextDistribution(domainId) {
        const pipeline = [
            { $match: { domainId, isLost: false } },
            { $group: { _id: '$anchorText', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
        ];
        return []; // Backlink.aggregate(pipeline);
    }
    async getBacklinkTimeline(domainId) {
        const pipeline = [
            { $match: { domainId } },
            {
                $group: {
                    _id: {
                        year: { $year: '$firstSeen' },
                        month: { $month: '$firstSeen' },
                        day: { $dayOfMonth: '$firstSeen' }
                    },
                    gained: { $sum: { $cond: [{ $eq: ['$isLost', false] }, 1, 0] } },
                    lost: { $sum: { $cond: [{ $eq: ['$isLost', true] }, 1, 0] } }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
            { $limit: 30 }
        ];
        return []; // Backlink.aggregate(pipeline);
    }
}
exports.BacklinkService = BacklinkService;
