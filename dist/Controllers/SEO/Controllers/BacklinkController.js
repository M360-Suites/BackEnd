"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BacklinkController = void 0;
const Services_1 = require("../Services");
const SEOModels_1 = require("../../../Models/SEOModels");
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
const joi_1 = __importDefault(require("joi"));
const responseService_1 = require("../../../Services/responseService");
class BacklinkController {
    constructor() {
        // Initialize with API keys from environment
        this.backlinkService = new Services_1.BacklinkService(process.env.AHREFS_API_KEY);
        this.queueService = new Services_1.QueueService();
    }
    // Start backlink scan
    async scanBacklinks(req, res) {
        try {
            const { domainId, usePaidAPI = false } = req.body;
            const organizationId = req.organizationId?._id;
            const { error } = joi_1.default.object({
                domainId: validationSchema_1.default.objectId,
            }).validate(req.body);
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            // Verify domain ownership
            const domain = await SEOModels_1.Domain.findOne({
                _id: domainId,
                organizationId,
            });
            if (!domain) {
                return (0, responseService_1.resSender)(res, 404, 'fail', 'Domain not found!');
            }
            // Queue the scan job
            const job = await this.queueService.addJob("backlink-scan", {
                domainId,
                organizationId,
                usePaidAPI,
                userId: req.user._id,
            });
            return (0, responseService_1.resSender)(res, 202, 'success', 'Backlink scan started', null, { jobId: job.id, statusUrl: `/api/seo/backlinks/scan/${job.id}/status` });
        }
        catch (error) {
            return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occurred");
        }
    }
    // Get backlink analysis
    async getAnalysis(req, res) {
        try {
            const { domainId } = req.params;
            const organizationId = req.organizationId?._id;
            const { error } = joi_1.default.object({
                domainId: validationSchema_1.default.objectId,
            }).validate(req.params);
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            const domain = await SEOModels_1.Domain.findOne({
                _id: domainId,
                organizationId,
            });
            if (!domain) {
                return (0, responseService_1.resSender)(res, 404, "fail", "Domain not found!");
            }
            const analysis = await this.backlinkService.analyzeBacklinkProfile(domainId);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Success', '', { domain: domain.url, analysis });
        }
        catch (error) {
            return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occurred");
        }
    }
    // Get backlink monitoring data
    async getMonitoring(req, res) {
        try {
            const { domainId } = req.params;
            const organizationId = req.organizationId?._id;
            const { error } = joi_1.default.object({
                domainId: validationSchema_1.default.objectId,
            }).validate(req.params);
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            const domain = await SEOModels_1.Domain.findOne({
                _id: domainId,
                organizationId,
            });
            if (!domain) {
                return (0, responseService_1.resSender)(res, 404, "fail", "Domain not found!");
            }
            const monitoring = await this.backlinkService.monitorBacklinks(domainId);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Success', null, { domain: domain.url, monitoring });
        }
        catch (error) {
            return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occurred");
        }
    }
    // Find competitors
    async findCompetitors(req, res) {
        try {
            const { domainId } = req.params;
            const organizationId = req.organizationId?._id;
            const { error } = joi_1.default.object({
                domainId: validationSchema_1.default.objectId,
            }).validate(req.params);
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            const domain = await SEOModels_1.Domain.findOne({
                _id: domainId,
                organizationId,
            });
            if (!domain) {
                return (0, responseService_1.resSender)(res, 404, "fail", "Domain not found!");
            }
            const competitors = await this.backlinkService.findCompetitors(domainId);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Success', null, { domain: domain.url, competitors, count: competitors.length });
        }
        catch (error) {
            return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occurred");
        }
    }
    // Get backlink timeline
    async getTimeline(req, res) {
        try {
            const { domainId } = req.params;
            const { days = 90 } = req.query;
            const organizationId = req.organizationId?._id;
            const { error } = joi_1.default.object({
                domainId: validationSchema_1.default.objectId,
            }).validate(req.params);
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            const domain = await SEOModels_1.Domain.findOne({
                _id: domainId,
                organizationId,
            });
            if (!domain) {
                return (0, responseService_1.resSender)(res, 404, "fail", "Domain not found!");
            }
            // Get backlinks with timeline data
            const backlinks = await this.backlinkService.getBacklinkTimeline(domainId);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Success', null, { domain: domain.url, days, timeline: backlinks });
        }
        catch (error) {
            return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occurred");
        }
    }
    // Get job status
    async getJobStatus(req, res) {
        try {
            const { jobId } = req.params;
            const { error } = joi_1.default.object({
                domainId: validationSchema_1.default.objectId,
            }).validate(req.params);
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            const status = await this.queueService.getJobStatus("backlink-scan", jobId);
            return (0, responseService_1.resSender)(res, 200, 'success', 'Success', null, status);
        }
        catch (error) {
            return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Error occurred');
        }
    }
}
exports.BacklinkController = BacklinkController;
