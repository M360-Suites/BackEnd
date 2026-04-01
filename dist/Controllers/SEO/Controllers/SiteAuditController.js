"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteAuditController = void 0;
const Services_1 = require("../Services");
const utils_1 = require("../../../helpers/utils");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
const responseService_1 = require("../../../Services/responseService");
class SiteAuditController {
    constructor() {
        this.requestAudit = (0, utils_1.asyncHandler)(async (req, res) => {
            const { url } = req.body;
            const organizationId = req.organizationId?._id;
            const { error } = joi_1.default.object({
                url: validationSchema_1.default.url,
            }).validate(req.body);
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            const auditId = await this.auditService.runAudit(url, organizationId);
            return (0, responseService_1.resSender)(res, 202, 'success', 'Audit started', null, { auditId, statusUrl: `/api/seo/audits/${auditId}` });
        });
        this.getAuditStatus = (0, utils_1.asyncHandler)(async (req, res) => {
            const { auditId } = req.params;
            const organizationId = req.organizationId?._id;
            const { error } = joi_1.default.object({
                auditId: validationSchema_1.default.objectId,
            }).validate(req.params);
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            const audit = await this.auditService.getAuditResults(auditId, organizationId);
            return (0, responseService_1.resSender)(res, 200, "success", "Successful", null, {
                url: audit.url,
                status: audit.status,
                progress: audit.progress || 0,
                startedAt: audit.startedAt,
                completedAt: audit.completedAt,
                result: audit.result,
                error: audit.error,
            });
        });
        this.getAuditHistory = (0, utils_1.asyncHandler)(async (req, res) => {
            const { limit = 10 } = req.query;
            const organizationId = req.organizationId?._id;
            const audits = await this.auditService.getAuditHistory(organizationId, parseInt(limit));
            return (0, responseService_1.resSender)(res, 200, 'success', 'Successful', null, { audits, count: audits.length });
        });
        this.generateReport = (0, utils_1.asyncHandler)(async (req, res) => {
            const { auditId } = req.params;
            const organizationId = req.organizationId?._id;
            const { error } = joi_1.default.object({
                auditId: validationSchema_1.default.objectId,
            }).validate(req.params);
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            const audit = await this.auditService.getAuditResults(auditId, organizationId);
            if (audit.status !== "completed") {
                return (0, responseService_1.resSender)(res, 400, 'fail', 'Audit not completed yet');
            }
            // Generate PDF report (simplified)
            const report = {
                title: `SEO Audit Report - ${audit.url}`,
                date: new Date().toISOString(),
                url: audit.url,
                technicalScore: audit.result.technical.seo.score,
                onPageScore: this.calculateOnPageScore(audit.result.onPage),
                recommendations: this.generateRecommendations(audit.result),
            };
            return (0, responseService_1.resSender)(res, 200, 'success', 'Successful', null, { report, downloadUrl: `/api/reports/${auditId}/download` });
        });
        const queueService = new Services_1.QueueService();
        this.auditService = new Services_1.SiteAuditService(process.env.PAGESPEED_API_KEY, process.env.SERPAPI_KEY, queueService);
    }
    calculateOnPageScore(onPageData) {
        // Simplified scoring logic
        let score = 100;
        if (onPageData.title.issues.length > 0)
            score -= 10;
        if (onPageData.metaDescription.issues.length > 0)
            score -= 10;
        if (onPageData.headings.issues.length > 0)
            score -= 10;
        if (onPageData.images.issues.length > 0)
            score -= 10;
        if (onPageData.links.issues.length > 0)
            score -= 10;
        return Math.max(0, score);
    }
    generateRecommendations(auditResult) {
        const recommendations = [];
        if (auditResult.technical.seo.score < 80) {
            recommendations.push("Improve technical SEO score");
        }
        if (auditResult.onPage.title.issues.length > 0) {
            recommendations.push("Fix title tag issues");
        }
        if (auditResult.onPage.images.altMissing > 0) {
            recommendations.push(`Add alt text to ${auditResult.onPage.images.altMissing} images`);
        }
        if (!auditResult.security.https) {
            recommendations.push("Implement HTTPS");
        }
        return recommendations;
    }
}
exports.SiteAuditController = SiteAuditController;
