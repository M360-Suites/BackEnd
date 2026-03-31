import { Response } from "express";
import { QueueService, TrafficService } from "../Services";
import { Domain } from "../../../Models/SEOModels";
import { CustomRequest } from "../../../Types/CustomRequest";
import { resSender } from "../../../Services/responseService";
import Joi from "joi";
import validationSchema from "../../../Services/validationSchema";

export class TrafficController {
  private trafficService: TrafficService;
  private queueService: QueueService;

  constructor() {
    // Initialize with GA credentials from environment
    const gaCredentials = process.env.GA_CREDENTIALS
      ? JSON.parse(process.env.GA_CREDENTIALS)
      : null;

    this.trafficService = new TrafficService(
      gaCredentials,
      process.env.GA_PROPERTY_ID,
    );

    this.queueService = new QueueService();
  }

  // Sync traffic data
  async syncTraffic(req: CustomRequest, res: Response) {
    try {
      const { domainId, days = 30 } = req.body;
      const organizationId = req.organizationId?._id as string;

      const { error } = Joi.object({
        domainId: validationSchema.objectId,
        days: Joi.number(),
      }).validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      // Verify domain ownership
      const domain = await Domain.findOne({
        _id: domainId,
        organizationId,
      });

      if (!domain) {
        return resSender(res, 404, "fail", "Domain not found!");
      }

      // Queue the sync job
      const job = await this.queueService.addJob("traffic-sync", {
        domainId,
        organizationId,
        days,
        userId: (req as any).user._id,
      });

      return resSender(res, 202, "success", "Traffic sync started", null, {
        jobId: job.id,
        statusUrl: `/api/traffic/sync/${job.id}/status`,
      });
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occurred");
    }
  }

  // Get traffic overview
  async getOverview(req: CustomRequest, res: Response) {
    try {
      const { domainId } = req.params;
      const { days = 7 } = req.query;
      const organizationId = req.organizationId?._id as string;

      const { error } = Joi.object({
        domainId: validationSchema.objectId,
        days: Joi.number(),
      }).validate({ domainId, days });
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const domain = await Domain.findOne({
        _id: domainId,
        organizationId,
      });

      if (!domain) {
        return resSender(res, 404, "fail", "Domain not found!");
      }

      const overview = await this.trafficService.getTrafficOverview(
        domainId,
        organizationId,
        parseInt(days as string),
      );

      return resSender(res, 200, "success", "Successful", null, {
        domain: domain.url,
        ...overview,
      });
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occurred");
    }
  }

  // Get realtime traffic
  async getRealtime(req: CustomRequest, res: Response) {
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

      const realtime = await this.trafficService.getRealtimeTraffic(domainId);

      return resSender(res, 200, "success", "Successful", null, {
        domain: domain.url,
        realtime,
        timestamp: new Date(),
      });
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occurred");
    }
  }

  // Get traffic sources
  async getSources(req: CustomRequest, res: Response) {
    try {
      const { domainId } = req.params;
      const { days = 30 } = req.query;
      const organizationId = req.organizationId?._id as string;

      const { error } = Joi.object({
        domainId: validationSchema.objectId,
        days: Joi.number(),
      }).validate({ domainId, days });
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const domain = await Domain.findOne({
        _id: domainId,
        organizationId,
      });

      if (!domain) {
        return resSender(res, 404, "fail", "Domain not found!");
      }

      const sources = await this.trafficService.getTrafficSources(
        domainId,
        organizationId,
        parseInt(days as string),
      );

      return resSender(res, 200, "success", "Successful", null, {
        domain: domain.url,
        ...sources,
      });
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occurred");
    }
  }

  // Get user acquisition
  async getAcquisition(req: CustomRequest, res: Response) {
    try {
      const { domainId } = req.params;
      const { days = 30 } = req.query;
      const organizationId = req.organizationId?._id as string;

      const { error } = Joi.object({
        domainId: validationSchema.objectId,
        days: Joi.number(),
      }).validate({ domainId, days });
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const domain = await Domain.findOne({
        _id: domainId,
        organizationId,
      });

      if (!domain) {
        return resSender(res, 404, "fail", "Domain not found!");
      }

      const acquisition = await this.trafficService.getUserAcquisition(
        domainId,
        parseInt(days as string),
      );

      return resSender(res, 200, "success", "Successful", null, {
        domain: domain.url,
        ...acquisition,
      });
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occurred");
    }
  }

  // Get traffic timeline
  async getTimeline(req: CustomRequest, res: Response) {
    try {
      const { domainId } = req.params;
      const { metric = "sessions", days = 30 } = req.query;
      const organizationId = req.organizationId?._id as string;

      const { error } = Joi.object({
        domainId: validationSchema.objectId,
        days: Joi.number(),
        metric: validationSchema.strings.valid("sessions"),
      }).validate({ domainId, days, metric });
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const domain = await Domain.findOne({
        _id: domainId,
        organizationId,
      });

      if (!domain) {
        return resSender(res, 404, "fail", "Domain not found!");
      }

      const startDate = new Date(
        Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000,
      );

      const trafficData = await this.trafficService.getTrafficOverview(
        domainId,
        organizationId,
        parseInt(days as string),
      );

      const timeline =
        trafficData.dailyData?.map((day: any) => ({
          date: day.date,
          value: day[metric as string] || 0,
        })) || [];

      return resSender(res, 200, "success", "Successful", null, {
        domain: domain.url,
        metric,
        days: parseInt(days as string),
        timeline,
      });
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occurred");
    }
  }

  // Get job status
  async getJobStatus(req: CustomRequest, res: Response) {
    try {
      const { jobId } = req.params;

      const { error } = Joi.object({
        jobId: validationSchema.objectId,
      }).validate(req.params);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const status = await this.queueService.getJobStatus(
        "traffic-sync",
        jobId,
      );

      return resSender(res, 200, "success", "Successful", null, status);
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occurred");
    }
  }
}
