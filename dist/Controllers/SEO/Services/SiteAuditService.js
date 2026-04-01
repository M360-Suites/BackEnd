"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteAuditService = void 0;
const SEOModels_1 = require("../../../Models/SEOModels");
const Providers_1 = require("../Providers");
class SiteAuditService {
    constructor(pageSpeedKey, serpApiKey, queueService) {
        this.pageSpeedProvider = new Providers_1.PageSpeedProvider(pageSpeedKey);
        this.serpProvider = new Providers_1.SerpAPIProvider(serpApiKey);
        this.scraper = new Providers_1.ScraperProvider();
        this.queueService = queueService;
    }
    async runAudit(url, organizationId) {
        // Create audit record
        const audit = await SEOModels_1.Audit.create({
            organizationId,
            url,
            status: "queued",
            startedAt: new Date(),
        });
        // Queue the audit job
        await this.queueService.addJob("site-audit", {
            auditId: audit._id,
            url,
            organizationId,
        });
        return audit._id;
    }
    async processAudit(auditId, url) {
        const audit = await SEOModels_1.Audit.findById(auditId);
        if (!audit)
            throw new Error("Audit not found");
        try {
            audit.status = "processing";
            audit.progress = 10;
            await audit.save();
            // 1. Technical audit (PageSpeed)
            const [mobileMetrics, desktopMetrics] = await Promise.all([
                this.pageSpeedProvider.analyzeUrl(url, "mobile"),
                this.pageSpeedProvider.analyzeUrl(url, "desktop"),
            ]);
            audit.progress = 30;
            await audit.save();
            // 2. On-page SEO audit (Scraper)
            const onPageData = await this.scraper.analyzeSEO(url);
            audit.progress = 60;
            await audit.save();
            // 3. Security check
            // const securityData = await this.scraper.checkSecurity(url);
            audit.progress = 80;
            await audit.save();
            // 4. Mobile friendly check
            // const mobileData = await this.scraper.checkMobile(url);
            audit.progress = 90;
            await audit.save();
            // Compile results
            const result = {
                technical: {
                    performance: { mobile: mobileMetrics, desktop: desktopMetrics },
                    accessibility: { score: mobileMetrics.accessibility },
                    bestPractices: { score: mobileMetrics.bestPractices },
                    seo: { score: mobileMetrics.seo },
                },
                onPage: onPageData,
                // security: securityData,
                // mobile: mobileData,
                // schema: await this.scraper.checkSchema(url),
            };
            // Save results
            audit.result = result;
            audit.status = "completed";
            audit.completedAt = new Date();
            audit.progress = 100;
            await audit.save();
        }
        catch (error) {
            audit.status = "failed";
            audit.error = error.message;
            await audit.save();
            throw error;
        }
    }
    async getAuditResults(auditId, organizationId) {
        const audit = await SEOModels_1.Audit.findOne({
            _id: auditId,
            organizationId,
        });
        if (!audit)
            throw new Error("Audit not found or access denied");
        return audit;
    }
    async getAuditHistory(organizationId, limit = 10) {
        return SEOModels_1.Audit.find({ organizationId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select("url status startedAt completedAt");
    }
}
exports.SiteAuditService = SiteAuditService;
