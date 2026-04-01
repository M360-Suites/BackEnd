"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrafficController = void 0;
const Services_1 = require("../Services");
const SEOModels_1 = require("../../../Models/SEOModels");
const responseService_1 = require("../../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
class TrafficController {
    constructor() {
        // Initialize with GA credentials from environment
        const gaCredentials = process.env.GA_CREDENTIALS
            ? JSON.parse(process.env.GA_CREDENTIALS)
            : null;
        this.trafficService = new Services_1.TrafficService(gaCredentials, process.env.GA_PROPERTY_ID);
        this.queueService = new Services_1.QueueService();
    }
    // Sync traffic data
    async syncTraffic(req, res) {
        try {
            const { domainId, days = 30 } = req.body;
            const organizationId = req.organizationId?._id;
            const { error } = joi_1.default.object({
                domainId: validationSchema_1.default.objectId,
                days: joi_1.default.number(),
            }).validate(req.body);
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            // Verify domain ownership
            const domain = await SEOModels_1.Domain.findOne({
                _id: domainId,
                organizationId,
            });
            if (!domain) {
                return (0, responseService_1.resSender)(res, 404, "fail", "Domain not found!");
            }
            // Queue the sync job
            const job = await this.queueService.addJob("traffic-sync", {
                domainId,
                organizationId,
                days,
                userId: req.user._id,
            });
            return (0, responseService_1.resSender)(res, 202, "success", "Traffic sync started", null, {
                jobId: job.id,
                statusUrl: `/api/traffic/sync/${job.id}/status`,
            });
        }
        catch (error) {
            return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occurred");
        }
    }
    // Get traffic overview
    async getOverview(req, res) {
        try {
            const { domainId } = req.params;
            const { days = 7 } = req.query;
            const organizationId = req.organizationId?._id;
            const { error } = joi_1.default.object({
                domainId: validationSchema_1.default.objectId,
                days: joi_1.default.number(),
            }).validate({ domainId, days });
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            const domain = await SEOModels_1.Domain.findOne({
                _id: domainId,
                organizationId,
            });
            if (!domain) {
                return (0, responseService_1.resSender)(res, 404, "fail", "Domain not found!");
            }
            const overview = await this.trafficService.getTrafficOverview(domainId, organizationId, parseInt(days));
            return (0, responseService_1.resSender)(res, 200, "success", "Successful", null, {
                domain: domain.url,
                ...overview,
            });
        }
        catch (error) {
            return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occurred");
        }
    }
    // Get realtime traffic
    async getRealtime(req, res) {
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
            const realtime = await this.trafficService.getRealtimeTraffic(domainId);
            return (0, responseService_1.resSender)(res, 200, "success", "Successful", null, {
                domain: domain.url,
                realtime,
                timestamp: new Date(),
            });
        }
        catch (error) {
            return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occurred");
        }
    }
    // Get traffic sources
    async getSources(req, res) {
        try {
            const { domainId } = req.params;
            const { days = 30 } = req.query;
            const organizationId = req.organizationId?._id;
            const { error } = joi_1.default.object({
                domainId: validationSchema_1.default.objectId,
                days: joi_1.default.number(),
            }).validate({ domainId, days });
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            const domain = await SEOModels_1.Domain.findOne({
                _id: domainId,
                organizationId,
            });
            if (!domain) {
                return (0, responseService_1.resSender)(res, 404, "fail", "Domain not found!");
            }
            const sources = await this.trafficService.getTrafficSources(domainId, organizationId, parseInt(days));
            return (0, responseService_1.resSender)(res, 200, "success", "Successful", null, {
                domain: domain.url,
                ...sources,
            });
        }
        catch (error) {
            return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occurred");
        }
    }
    // Get user acquisition
    async getAcquisition(req, res) {
        try {
            const { domainId } = req.params;
            const { days = 30 } = req.query;
            const organizationId = req.organizationId?._id;
            const { error } = joi_1.default.object({
                domainId: validationSchema_1.default.objectId,
                days: joi_1.default.number(),
            }).validate({ domainId, days });
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            const domain = await SEOModels_1.Domain.findOne({
                _id: domainId,
                organizationId,
            });
            if (!domain) {
                return (0, responseService_1.resSender)(res, 404, "fail", "Domain not found!");
            }
            const acquisition = await this.trafficService.getUserAcquisition(domainId, parseInt(days));
            return (0, responseService_1.resSender)(res, 200, "success", "Successful", null, {
                domain: domain.url,
                ...acquisition,
            });
        }
        catch (error) {
            return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occurred");
        }
    }
    // Get traffic timeline
    async getTimeline(req, res) {
        try {
            const { domainId } = req.params;
            const { metric = "sessions", days = 30 } = req.query;
            const organizationId = req.organizationId?._id;
            const { error } = joi_1.default.object({
                domainId: validationSchema_1.default.objectId,
                days: joi_1.default.number(),
                metric: validationSchema_1.default.strings.valid("sessions"),
            }).validate({ domainId, days, metric });
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            const domain = await SEOModels_1.Domain.findOne({
                _id: domainId,
                organizationId,
            });
            if (!domain) {
                return (0, responseService_1.resSender)(res, 404, "fail", "Domain not found!");
            }
            const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
            const trafficData = await this.trafficService.getTrafficOverview(domainId, organizationId, parseInt(days));
            const timeline = trafficData.dailyData?.map((day) => ({
                date: day.date,
                value: day[metric] || 0,
            })) || [];
            return (0, responseService_1.resSender)(res, 200, "success", "Successful", null, {
                domain: domain.url,
                metric,
                days: parseInt(days),
                timeline,
            });
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
                jobId: validationSchema_1.default.objectId,
            }).validate(req.params);
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            const status = await this.queueService.getJobStatus("traffic-sync", jobId);
            return (0, responseService_1.resSender)(res, 200, "success", "Successful", null, status);
        }
        catch (error) {
            return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occurred");
        }
    }
}
exports.TrafficController = TrafficController;
