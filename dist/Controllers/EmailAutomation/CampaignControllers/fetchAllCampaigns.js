"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAllCampaigns = void 0;
const logger_1 = require("../../../logger/logger");
const responseService_1 = require("../../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const Campaign_1 = require("../../../Models/Campaign");
const utils_1 = require("../../../helpers/utils");
exports.fetchAllCampaigns = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const orgId = (req.organizationId)?._id;
        let query = { org: orgId };
        const { page, limit } = req.query;
        const { type, timespan, status } = req.body;
        const { error } = joi_1.default.object({
            page: joi_1.default.number().integer().min(1).default(1),
            limit: joi_1.default.number().integer().min(1).default(10),
            type: joi_1.default.string().valid("oneTime", "drip").optional(),
            timespan: joi_1.default.string()
                .valid("today", "week", "month", "year")
                .optional(),
            status: joi_1.default.string().valid("active", "completed", "failed").optional(),
        }).validate({ page, limit, type, timespan, status });
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        if (type) {
            if (type === "oneTime") {
                query.type = Campaign_1.CampaignType.oneTime;
            }
            else if (type === "drip") {
                query.type = Campaign_1.CampaignType.drip;
            }
        }
        if (status)
            query.status = status;
        if (timespan) {
            const today = new Date();
            let startDate;
            switch (timespan) {
                case "today":
                    startDate = new Date(today.setHours(0, 0, 0, 0));
                    break;
                case "week":
                    startDate = new Date(today.setDate(today.getDate() - 7));
                    break;
                case "month":
                    startDate = new Date(today.setMonth(today.getMonth() - 1));
                    break;
                case "year":
                    startDate = new Date(today.setFullYear(today.getFullYear() - 1));
                    break;
                default:
                    startDate = new Date();
            }
            query.createdAt = { $gte: startDate };
        }
        const campaigns = await Campaign_1.Campaign.find(query)
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .sort({ createdAt: -1 });
        const totalCampaigns = await Campaign_1.Campaign.countDocuments(query);
        const totalPages = Math.ceil(totalCampaigns / Number(limit));
        // Calculate the open rate % for each campaign
        const campaignsWithOpenRate = await Promise.all(campaigns.map(async (campaign) => {
            const totalSent = campaign.totalSent || 0;
            const totalOpened = campaign.totalOpened || 0;
            const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(2) : 0;
            return {
                ...campaign.toObject(),
                openRate: `${openRate}%`,
            };
        }));
        return (0, responseService_1.resSender)(res, 200, "success", "Campaigns fetched successfully", null, {
            campaigns: campaignsWithOpenRate,
            totalCampaigns,
            totalPages,
            currentPage: Number(page),
            limit: Number(limit),
        });
    }
    catch (error) {
        logger_1.logger.error("Error fetching campaigns:", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error fetching campaigns");
    }
});
