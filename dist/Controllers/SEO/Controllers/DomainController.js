"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainController = void 0;
const axios_1 = __importDefault(require("axios"));
const promises_1 = __importDefault(require("dns/promises"));
const SEOModels_1 = require("../../../Models/SEOModels");
const User_1 = require("../../../Models/User");
const responseService_1 = require("../../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
class DomainController {
    // Add new domain
    async addDomain(req, res) {
        try {
            const { url, name } = req.body;
            const organizationId = req.organizationId?._id;
            const { error } = joi_1.default.object({
                url: validationSchema_1.default.url,
                name: validationSchema_1.default.name,
            }).validate(req.body);
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            // Check if organization can add more domains
            const org = await User_1.Organization.findById(organizationId);
            const domainCount = await SEOModels_1.Domain.countDocuments({ organizationId });
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
            const existingDomain = await SEOModels_1.Domain.findOne({
                organizationId,
                url: normalizedUrl,
            });
            if (existingDomain) {
                return (0, responseService_1.resSender)(res, 400, "fail", "Domain already exists!");
            }
            // Verify domain accessibility
            const isAccessible = await this.verifyDomainAccessibility(normalizedUrl);
            if (!isAccessible) {
                return (0, responseService_1.resSender)(res, 400, "fail", "Domain is not accessible!");
            }
            // Create domain
            const domain = new SEOModels_1.Domain({
                organizationId,
                url: normalizedUrl,
                name: name || this.extractDomainName(normalizedUrl),
                verificationCode: this.generateVerificationCode(),
                status: "active",
            });
            await domain.save();
            return (0, responseService_1.resSender)(res, 201, "success", "Domain added successfully", null, {
                domain,
                verification: {
                    required: true,
                    methods: ["meta-tag", "dns", "file"],
                    code: domain.verificationCode,
                },
            });
        }
        catch (error) {
            return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error...");
        }
    }
    // List domains
    async listDomains(req, res) {
        try {
            const organizationId = req.organizationId?._id;
            const { limit = 20, offset = 0, status } = req.query;
            const { error } = joi_1.default.object({
                limit: joi_1.default.number().optional(),
                offset: joi_1.default.number().optional(),
                status: validationSchema_1.default.text,
            }).validate(req.query);
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            const query = { organizationId };
            if (status) {
                query.status = status;
            }
            const domains = await SEOModels_1.Domain.find(query)
                .skip(parseInt(offset))
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });
            const total = await SEOModels_1.Domain.countDocuments(query);
            return (0, responseService_1.resSender)(res, 200, "success", "Success", null, {
                domains,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: total > parseInt(offset) + domains.length,
                },
            });
        }
        catch (error) {
            return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error...");
        }
    }
    // Get domain details
    async getDomain(req, res) {
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
            // Get domain summary
            const summary = await this.getDomainSummary(domainId);
            return (0, responseService_1.resSender)(res, 200, "success", "Success", null, {
                domain,
                summary,
            });
        }
        catch (error) {
            return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error...");
        }
    }
    // Update domain
    async updateDomain(req, res) {
        try {
            const { domainId } = req.params;
            const { name, tracking } = req.body;
            const organizationId = req.organizationId?._id;
            const { error } = joi_1.default.object({
                name: validationSchema_1.default.strings,
                tracking: joi_1.default.any(),
            }).validate(req.body);
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            const domain = await SEOModels_1.Domain.findOne({
                _id: domainId,
                organizationId,
            });
            if (!domain) {
                return (0, responseService_1.resSender)(res, 404, "fail", "Domain not found!");
            }
            const updates = {};
            if (name)
                updates.name = name;
            if (tracking) {
                updates.tracking = {
                    ...domain.tracking,
                    ...tracking,
                    lastTracked: domain.tracking.lastTracked || new Date(),
                };
            }
            const updatedDomain = await SEOModels_1.Domain.findByIdAndUpdate(domainId, { $set: updates }, { new: true });
            return (0, responseService_1.resSender)(res, 200, "success", "Domain updated successfully", null, { domain: updatedDomain });
        }
        catch (error) {
            return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error...");
        }
    }
    // Delete domain
    async deleteDomain(req, res) {
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
            await SEOModels_1.Domain.findByIdAndDelete(domainId);
            return (0, responseService_1.resSender)(res, 200, "success", "Domain deleted successfully");
        }
        catch (error) {
            return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error...");
        }
    }
    // Verify domain ownership
    async verifyDomain(req, res) {
        try {
            const { domainId } = req.params;
            const { method } = req.body;
            const organizationId = req.organizationId?._id;
            const { error } = joi_1.default.object({
                domainId: validationSchema_1.default.objectId,
                method: validationSchema_1.default.strings.valid("meta-tag", "dns", "file"),
            }).validate({ domainId, method });
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            const domain = await SEOModels_1.Domain.findOne({
                _id: domainId,
                organizationId,
            });
            if (!domain) {
                return (0, responseService_1.resSender)(res, 404, "fail", "Domain not found!");
            }
            let isVerified = false;
            switch (method) {
                case "meta-tag":
                    isVerified = await this.verifyMetaTag(domain.url, domain.verificationCode);
                    break;
                case "dns":
                    isVerified = await this.verifyDNS(domain.url, domain.verificationCode);
                    break;
                case "file":
                    isVerified = await this.verifyFile(domain.url, domain.verificationCode);
                    break;
                default:
                    return (0, responseService_1.resSender)(res, 400, "fail", "Invalid verification method");
            }
            if (isVerified) {
                domain.verified = true;
                await domain.save();
                return (0, responseService_1.resSender)(res, 200, "success", "Domain verified successfully", null, { verified: true });
            }
            else {
                return (0, responseService_1.resSender)(res, 400, "fail", "Domain verification failed", null, {
                    verified: false,
                });
            }
        }
        catch (error) {
            return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error...");
        }
    }
    // Get domain verification instructions
    async getVerificationInstructions(req, res) {
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
            return (0, responseService_1.resSender)(res, 200, "success", "Successful", null, {
                domain: domain.url,
                code: domain.verificationCode,
                instructions,
            });
        }
        catch (error) {
            return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error...");
        }
    }
    // Helper methods
    normalizeUrl(url) {
        let normalized = url.toLowerCase().trim();
        // Remove protocol
        normalized = normalized.replace(/^(https?:\/\/)/, "");
        // Remove trailing slash
        normalized = normalized.replace(/\/$/, "");
        // Remove www prefix
        normalized = normalized.replace(/^www\./, "");
        return normalized;
    }
    extractDomainName(url) {
        const parts = url.split(".");
        if (parts.length > 1) {
            return (parts[parts.length - 2].charAt(0).toUpperCase() +
                parts[parts.length - 2].slice(1));
        }
        return url;
    }
    generateVerificationCode() {
        return `seosaas_${Math.random().toString(36).substr(2, 9)}`;
    }
    async verifyDomainAccessibility(url) {
        try {
            // Check DNS resolution
            await promises_1.default.lookup(url);
            // Check if website responds
            const response = await axios_1.default.get(`https://${url}`, {
                timeout: 10000,
                validateStatus: () => true, // Accept any status code
            });
            return response.status < 500; // Accept any status except server errors
        }
        catch (error) {
            return false;
        }
    }
    async verifyMetaTag(url, code) {
        try {
            const response = await axios_1.default.get(`https://${url}`, {
                timeout: 10000,
            });
            const html = response.data;
            const metaTag = `<meta name="seo-saas-verification" content="${code}" />`;
            return html.includes(metaTag);
        }
        catch (error) {
            return false;
        }
    }
    async verifyDNS(url, code) {
        try {
            const txtRecords = await promises_1.default.resolveTxt(url);
            const flattened = txtRecords.flat();
            return flattened.includes(code);
        }
        catch (error) {
            return false;
        }
    }
    async verifyFile(url, code) {
        try {
            const response = await axios_1.default.get(`https://${url}/seo-saas-${code}.html`, {
                timeout: 10000,
            });
            return response.data.includes(code);
        }
        catch (error) {
            return false;
        }
    }
    async getDomainSummary(domainId) {
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
exports.DomainController = DomainController;
