import { Request, Response } from "express";
import { QueueService, SiteAuditService } from "../Services";
import { asyncHandler } from "../../../helpers/utils";
import { CustomRequest } from "../../../Types/CustomRequest";
import Joi from "joi";
import validationSchema from "../../../Services/validationSchema";
import { resSender } from "../../../Services/responseService";

export class SiteAuditController {
  private auditService: SiteAuditService;

  constructor() {
    const queueService = new QueueService();
    this.auditService = new SiteAuditService(
      process.env.PAGESPEED_API_KEY!,
      process.env.SERPAPI_KEY!,
      queueService,
    );
  }

  requestAudit = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { url } = req.body;
    const organizationId = req.organizationId?._id as string;

    const { error } = Joi.object({
      url: validationSchema.url,
    }).validate(req.body);
    if (error) return resSender(res, 400, "fail", error.details[0].message);

    const auditId = await this.auditService.runAudit(url, organizationId);

    return resSender(res, 202, 'success', 'Audit started', null, { auditId, statusUrl: `/api/seo/audits/${auditId}` })
  });

  getAuditStatus = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { auditId } = req.params;
    const organizationId = req.organizationId?._id as string;

    const { error } = Joi.object({
      auditId: validationSchema.objectId,
    }).validate(req.params);
    if (error) return resSender(res, 400, "fail", error.details[0].message);

    const audit = await this.auditService.getAuditResults(
      auditId,
      organizationId,
    );

    return resSender(res, 200, "success", "Successful", null, {
      url: audit.url,
      status: audit.status,
      progress: audit.progress || 0,
      startedAt: audit.startedAt,
      completedAt: audit.completedAt,
      result: audit.result,
      error: audit.error,
    });
  });

  getAuditHistory = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { limit = 10 } = req.query;
    const organizationId = req.organizationId?._id as string;

    const audits = await this.auditService.getAuditHistory(
      organizationId,
      parseInt(limit as string),
    );

    return resSender(res, 200, 'success', 'Successful', null, { audits, count: audits.length })
  });

  generateReport = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { auditId } = req.params;
    const organizationId = req.organizationId?._id as string;

    const { error } = Joi.object({
      auditId: validationSchema.objectId,
    }).validate(req.params);
    if (error) return resSender(res, 400, "fail", error.details[0].message);

    const audit = await this.auditService.getAuditResults(
      auditId,
      organizationId,
    );

    if (audit.status !== "completed") {
      return resSender(res, 400, 'fail', 'Audit not completed yet');
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

    return resSender(res, 200, 'success', 'Successful', null, { report, downloadUrl: `/api/reports/${auditId}/download` })
  });

  private calculateOnPageScore(onPageData: any): number {
    // Simplified scoring logic
    let score = 100;
    if (onPageData.title.issues.length > 0) score -= 10;
    if (onPageData.metaDescription.issues.length > 0) score -= 10;
    if (onPageData.headings.issues.length > 0) score -= 10;
    if (onPageData.images.issues.length > 0) score -= 10;
    if (onPageData.links.issues.length > 0) score -= 10;
    return Math.max(0, score);
  }

  private generateRecommendations(auditResult: any): string[] {
    const recommendations: string[] = [];

    if (auditResult.technical.seo.score < 80) {
      recommendations.push("Improve technical SEO score");
    }

    if (auditResult.onPage.title.issues.length > 0) {
      recommendations.push("Fix title tag issues");
    }

    if (auditResult.onPage.images.altMissing > 0) {
      recommendations.push(
        `Add alt text to ${auditResult.onPage.images.altMissing} images`,
      );
    }

    if (!auditResult.security.https) {
      recommendations.push("Implement HTTPS");
    }

    return recommendations;
  }
}
