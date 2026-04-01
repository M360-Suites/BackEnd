"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAllSubscribers = void 0;
const logger_1 = require("../../../logger/logger");
const responseService_1 = require("../../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const Campaign_1 = require("../../../Models/Campaign");
const utils_1 = require("../../../helpers/utils");
exports.fetchAllSubscribers = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const orgId = req.organizationId?._id;
        const { page = 1, limit = 10 } = req.query;
        const { error } = joi_1.default.object({
            page: joi_1.default.number().integer().min(1).default(1),
            limit: joi_1.default.number().integer().min(1).default(10),
        }).validate(req.query);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        const query = { subscribee: orgId };
        const subscribers = await Campaign_1.Subscriber.find(query)
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .sort({ createdAt: -1 });
        const totalSubscribers = await Campaign_1.Subscriber.countDocuments(query);
        const totalPages = Math.ceil(totalSubscribers / Number(limit));
        const response = {
            subscribers,
            totalSubscribers,
            totalPages,
            currentPage: Number(page),
            limit: Number(limit),
        };
        return (0, responseService_1.resSender)(res, 200, "success", "Subscribers fetched successfully", null, response);
    }
    catch (error) {
        logger_1.logger.error("Error fetching subscribers:", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error fetching subscribers");
    }
});
