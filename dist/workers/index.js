"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWorkers = setupWorkers;
const Services_1 = require("../Controllers/SEO/Services");
function setupWorkers() {
    const queueService = new Services_1.QueueService();
    // Initialize services
    const auditService = new Services_1.SiteAuditService(process.env.PAGESPEED_API_KEY, process.env.SERPAPI_KEY, queueService);
    const backlinkService = new Services_1.BacklinkService(process.env.AHREFS_API_KEY);
    const trafficService = new Services_1.TrafficService(process.env.GA_CREDENTIALS ? JSON.parse(process.env.GA_CREDENTIALS) : null, process.env.GA_PROPERTY_ID);
    // Setup audit worker
    queueService.setupAuditWorker(async (job) => {
        const { websiteId, url, organizationId } = job.data;
        try {
            await job.progress(10);
            const result = await auditService.runAudit(url, organizationId);
            await job.progress(100);
            return result;
        }
        catch (error) {
            throw new Error(`Audit failed: ${error.message}`);
        }
    });
    // Setup backlink worker
    queueService.setupBacklinkWorker(async (job) => {
        const { domainId, organizationId, usePaidAPI } = job.data;
        try {
            await job.progress(10);
            const result = await backlinkService.scanBacklinks(domainId, organizationId, usePaidAPI);
            await job.progress(100);
            return result;
        }
        catch (error) {
            throw new Error(`Backlink scan failed: ${error.message}`);
        }
    });
    // Setup traffic worker
    queueService.setupKeywordWorker(async (job) => {
        // Keyword tracking worker implementation
        // Similar pattern as above
        const { name } = job.data;
        try {
            console.log('Data: ', job.data);
        }
        catch (error) {
            throw new Error(`Traffic scan failed: ${error.message}`);
        }
    });
    console.log("Workers initialized");
}
