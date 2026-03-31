import { Response } from "express";
import { BacklinkService, QueueService } from "../Services";
import { Domain } from "../../../Models/SEOModels";
import { CustomRequest } from "../../../Types/CustomRequest";
import validationSchema from "../../../Services/validationSchema";
import Joi from "joi";
import { resSender } from "../../../Services/responseService";

export class BacklinkController {
  private backlinkService: BacklinkService;
  private queueService: QueueService;

  constructor() {
    // Initialize with API keys from environment
    this.backlinkService = new BacklinkService(process.env.AHREFS_API_KEY);
    this.queueService = new QueueService();
  }

  // Start backlink scan
  async scanBacklinks(req: CustomRequest, res: Response) {
    try {
      const { domainId, usePaidAPI = false } = req.body;
      const organizationId = req.organizationId?._id as string;

      const { error } = Joi.object({
        domainId: validationSchema.objectId,
      }).validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      // Verify domain ownership
      const domain = await Domain.findOne({
        _id: domainId,
        organizationId,
      });

      if (!domain) {
        return resSender(res, 404, 'fail', 'Domain not found!');
      }

      // Queue the scan job
      const job = await this.queueService.addJob("backlink-scan", {
        domainId,
        organizationId,
        usePaidAPI,
        userId: (req as any).user._id,
      });

      return resSender(res, 202, 'success', 'Backlink scan started', null, { jobId: job.id, statusUrl: `/api/seo/backlinks/scan/${job.id}/status` })
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occurred");
    }
  }

  // Get backlink analysis
  async getAnalysis(req: CustomRequest, res: Response) {
    try {
      const { domainId } = req.params;
      const organizationId = req.organizationId?._id as string;

      const { error } = Joi.object({
        domainId: validationSchema.objectId,
      }).validate(req.params);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const domain = await Domain.findOne({
        _id: domainId,
        organizationId,
      });

      if (!domain) {
        return resSender(res, 404, "fail", "Domain not found!");
      }

      const analysis =
        await this.backlinkService.analyzeBacklinkProfile(domainId);

      return resSender(res, 200, 'success', 'Success', '', { domain: domain.url, analysis });
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occurred");
    }
  }

  // Get backlink monitoring data
  async getMonitoring(req: CustomRequest, res: Response) {
    try {
      const { domainId } = req.params;
      const organizationId = req.organizationId?._id as string;

      const { error } = Joi.object({
        domainId: validationSchema.objectId,
      }).validate(req.params);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const domain = await Domain.findOne({
        _id: domainId,
        organizationId,
      });

      if (!domain) {
        return resSender(res, 404, "fail", "Domain not found!");
      }

      const monitoring = await this.backlinkService.monitorBacklinks(domainId);

      return resSender(res, 200, 'success', 'Success', null, { domain: domain.url, monitoring });
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occurred");
    }
  }

  // Find competitors
  async findCompetitors(req: CustomRequest, res: Response) {
    try {
      const { domainId } = req.params;
      const organizationId = req.organizationId?._id as string;

      const { error } = Joi.object({
        domainId: validationSchema.objectId,
      }).validate(req.params);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const domain = await Domain.findOne({
        _id: domainId,
        organizationId,
      });

      if (!domain) {
        return resSender(res, 404, "fail", "Domain not found!");
      }

      const competitors = await this.backlinkService.findCompetitors(domainId);

      return resSender(res, 200, 'success', 'Success', null, { domain: domain.url, competitors, count: competitors.length });
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occurred");
    }
  }

  // Get backlink timeline
  async getTimeline(req: CustomRequest, res: Response) {
    try {
      const { domainId } = req.params;
      const { days = 90 } = req.query;
      const organizationId = req.organizationId?._id as string;

      const { error } = Joi.object({
        domainId: validationSchema.objectId,
      }).validate(req.params);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const domain = await Domain.findOne({
        _id: domainId,
        organizationId,
      });

      if (!domain) {
        return resSender(res, 404, "fail", "Domain not found!");
      }

      // Get backlinks with timeline data
      const backlinks =
        await this.backlinkService.getBacklinkTimeline(domainId);

      return resSender(res, 200, 'success', 'Success', null, { domain: domain.url, days, timeline: backlinks });
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occurred");
    }
  }

  // Get job status
  async getJobStatus(req: CustomRequest, res: Response) {
    try {
      const { jobId } = req.params;

      const { error } = Joi.object({
        domainId: validationSchema.objectId,
      }).validate(req.params);
      if (error) return resSender(res, 400, "fail", error.details[0].message);
      
      const status = await this.queueService.getJobStatus(
        "backlink-scan",
        jobId,
      );

      return resSender(res, 200, 'success', 'Success', null, status);
    } catch (error: any) {
      return resSender(res, 500, 'error', error.message || 'Error occurred')
    }
  }
}
