import { Response } from "express";
import { CustomRequest } from "../../../Types/CustomRequest";
import axios from "axios";
import dns from "dns/promises";
import { Domain } from "../../../Models/SEOModels";
import { Organization } from "../../../Models/User";
import { resSender } from "../../../Services/responseService";
import Joi from "joi";
import validationSchema from "../../../Services/validationSchema";

export class DomainController {
  // Add new domain
  async addDomain(req: CustomRequest, res: Response) {
    try {
      const { url, name } = req.body;
      const organizationId = req.organizationId?._id as string;

      const { error } = Joi.object({
        url: validationSchema.url,
        name: validationSchema.name,
      }).validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      // Check if organization can add more domains
      const org = await Organization.findById(organizationId);
      const domainCount = await Domain.countDocuments({ organizationId });

      // if (domainCount >= (org?.limits.maxWebsites || 1)) {
      //   return res.status(403).json({
      //     error: "Domain limit reached",
      //     current: domainCount,
      //     limit: org?.limits.maxWebsites,
      //     upgradeUrl: "/billing/upgrade",
      //   });
      // }

      // Normalize URL
      const normalizedUrl = this.normalizeUrl(url);

      // Check if domain already exists
      const existingDomain = await Domain.findOne({
        organizationId,
        url: normalizedUrl,
      });

      if (existingDomain) {
        return resSender(res, 400, "fail", "Domain already exists!");
      }

      // Verify domain accessibility
      const isAccessible = await this.verifyDomainAccessibility(normalizedUrl);
      if (!isAccessible) {
        return resSender(res, 400, "fail", "Domain is not accessible!");
      }

      // Create domain
      const domain = new Domain({
        organizationId,
        url: normalizedUrl,
        name: name || this.extractDomainName(normalizedUrl),
        verificationCode: this.generateVerificationCode(),
        status: "active",
      });

      await domain.save();

      return resSender(res, 201, "success", "Domain added successfully", null, {
        domain,
        verification: {
          required: true,
          methods: ["meta-tag", "dns", "file"],
          code: domain.verificationCode,
        },
      });
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error...");
    }
  }

  // List domains
  async listDomains(req: CustomRequest, res: Response) {
    try {
      const organizationId = req.organizationId?._id as string;
      const { limit = 20, offset = 0, status } = req.query;

      const { error } = Joi.object({
        limit: Joi.number().optional(),
        offset: Joi.number().optional(),
        status: validationSchema.text,
      }).validate(req.query);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const query: any = { organizationId };
      if (status) {
        query.status = status;
      }

      const domains = await Domain.find(query)
        .skip(parseInt(offset as string))
        .limit(parseInt(limit as string))
        .sort({ createdAt: -1 });

      const total = await Domain.countDocuments(query);

      return resSender(res, 200, "success", "Success", null, {
        domains,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: total > parseInt(offset as string) + domains.length,
        },
      });
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error...");
    }
  }

  // Get domain details
  async getDomain(req: CustomRequest, res: Response) {
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

      // Get domain summary
      const summary = await this.getDomainSummary(domainId);

      return resSender(res, 200, "success", "Success", null, {
        domain,
        summary,
      });
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error...");
    }
  }

  // Update domain
  async updateDomain(req: CustomRequest, res: Response) {
    try {
      const { domainId } = req.params;
      const { name, tracking } = req.body;
      const organizationId = req.organizationId?._id as string;

      const { error } = Joi.object({
        name: validationSchema.strings,
        tracking: Joi.any(),
      }).validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const domain = await Domain.findOne({
        _id: domainId,
        organizationId,
      });

      if (!domain) {
        return resSender(res, 404, "fail", "Domain not found!");
      }

      const updates: any = {};
      if (name) updates.name = name;
      if (tracking) {
        updates.tracking = {
          ...domain.tracking,
          ...tracking,
          lastTracked: domain.tracking.lastTracked || new Date(),
        };
      }

      const updatedDomain = await Domain.findByIdAndUpdate(
        domainId,
        { $set: updates },
        { new: true },
      );

      return resSender(
        res,
        200,
        "success",
        "Domain updated successfully",
        null,
        { domain: updatedDomain },
      );
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error...");
    }
  }

  // Delete domain
  async deleteDomain(req: CustomRequest, res: Response) {
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

      await Domain.findByIdAndDelete(domainId);

      return resSender(res, 200, "success", "Domain deleted successfully");
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error...");
    }
  }

  // Verify domain ownership
  async verifyDomain(req: CustomRequest, res: Response) {
    try {
      const { domainId } = req.params;
      const { method } = req.body;
      const organizationId = req.organizationId?._id as string;

      const { error } = Joi.object({
        domainId: validationSchema.objectId,
        method: validationSchema.strings.valid("meta-tag", "dns", "file"),
      }).validate({ domainId, method });
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const domain = await Domain.findOne({
        _id: domainId,
        organizationId,
      });

      if (!domain) {
        return resSender(res, 404, "fail", "Domain not found!");
      }

      let isVerified = false;

      switch (method) {
        case "meta-tag":
          isVerified = await this.verifyMetaTag(
            domain.url,
            domain.verificationCode!,
          );
          break;
        case "dns":
          isVerified = await this.verifyDNS(
            domain.url,
            domain.verificationCode!,
          );
          break;
        case "file":
          isVerified = await this.verifyFile(
            domain.url,
            domain.verificationCode!,
          );
          break;
        default:
          return resSender(res, 400, "fail", "Invalid verification method");
      }

      if (isVerified) {
        domain.verified = true;
        await domain.save();

        return resSender(
          res,
          200,
          "success",
          "Domain verified successfully",
          null,
          { verified: true },
        );
      } else {
        return resSender(res, 400, "fail", "Domain verification failed", null, {
          verified: false,
        });
      }
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error...");
    }
  }

  // Get domain verification instructions
  async getVerificationInstructions(req: CustomRequest, res: Response) {
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

      const instructions = {
        metaTag: {
          code: `<meta name="seo-saas-verification" content="${domain.verificationCode}" />`,
          placement: "Inside the <head> section of your homepage",
        },
        dns: {
          type: "TXT",
          name: "@",
          value: domain.verificationCode,
        },
        file: {
          filename: `seo-saas-${domain.verificationCode}.html`,
          content: `<html><head><title>Verification</title></head><body>${domain.verificationCode}</body></html>`,
          url: `https://${domain.url}/seo-saas-${domain.verificationCode}.html`,
        },
      };

      return resSender(res, 200, "success", "Successful", null, {
        domain: domain.url,
        code: domain.verificationCode,
        instructions,
      });
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error...");
    }
  }

  // Helper methods
  private normalizeUrl(url: string): string {
    let normalized = url.toLowerCase().trim();

    // Remove protocol
    normalized = normalized.replace(/^(https?:\/\/)/, "");

    // Remove trailing slash
    normalized = normalized.replace(/\/$/, "");

    // Remove www prefix
    normalized = normalized.replace(/^www\./, "");

    return normalized;
  }

  private extractDomainName(url: string): string {
    const parts = url.split(".");
    if (parts.length > 1) {
      return (
        parts[parts.length - 2].charAt(0).toUpperCase() +
        parts[parts.length - 2].slice(1)
      );
    }
    return url;
  }

  private generateVerificationCode(): string {
    return `seosaas_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async verifyDomainAccessibility(url: string): Promise<boolean> {
    try {
      // Check DNS resolution
      await dns.lookup(url);

      // Check if website responds
      const response = await axios.get(`https://${url}`, {
        timeout: 10000,
        validateStatus: () => true, // Accept any status code
      });

      return response.status < 500; // Accept any status except server errors
    } catch (error) {
      return false;
    }
  }

  private async verifyMetaTag(url: string, code: string): Promise<boolean> {
    try {
      const response = await axios.get(`https://${url}`, {
        timeout: 10000,
      });

      const html = response.data;
      const metaTag = `<meta name="seo-saas-verification" content="${code}" />`;

      return html.includes(metaTag);
    } catch (error) {
      return false;
    }
  }

  private async verifyDNS(url: string, code: string): Promise<boolean> {
    try {
      const txtRecords = await dns.resolveTxt(url);
      const flattened = txtRecords.flat();
      return flattened.includes(code);
    } catch (error) {
      return false;
    }
  }

  private async verifyFile(url: string, code: string): Promise<boolean> {
    try {
      const response = await axios.get(`https://${url}/seo-saas-${code}.html`, {
        timeout: 10000,
      });

      return response.data.includes(code);
    } catch (error) {
      return false;
    }
  }

  private async getDomainSummary(domainId: string): Promise<any> {
    // Get counts from related collections
    // This would need proper models and aggregation
    return {
      audits: 0,
      keywords: 0,
      backlinks: 0,
      trafficDays: 0,
      lastAudit: null,
      lastBacklinkScan: null,
    };
  }
}
