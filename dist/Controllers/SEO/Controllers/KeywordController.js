"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeywordController = void 0;
const utils_1 = require("../../../helpers/utils");
const Services_1 = require("../Services");
const responseService_1 = require("../../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
class KeywordController {
    constructor() {
        this.addKeywords = (0, utils_1.asyncHandler)(async (req, res) => {
            const { domain, keywords, location = "us" } = req.body;
            const organizationId = req.organizationId?._id;
            const { error } = joi_1.default.object({
                domain: validationSchema_1.default.strings,
                keywords: joi_1.default.array().items(joi_1.default.string().required()).min(1).required(),
                // location:
            }).validate(req.body);
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            if (!domain || !keywords || !Array.isArray(keywords)) {
                return res.status(400).json({
                    error: "Domain and keywords array are required",
                });
            }
            await this.keywordService.trackMultipleKeywords(organizationId, domain, keywords, location);
            return (0, responseService_1.resSender)(res, 200, 'success', `Tracking ${keywords.length} keywords for ${domain}`, null, keywords);
        });
        this.getRankings = (0, utils_1.asyncHandler)(async (req, res) => {
            const { domain, keyword, days = '30' } = req.query;
            const organizationId = req.organizationId?._id;
            const { error } = joi_1.default.object({
                domain: validationSchema_1.default.strings,
                keyword: validationSchema_1.default.strings,
                // location:
            }).validate(req.query);
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            if (!domain || !keyword) {
                return res.status(400).json({
                    error: "Domain and keyword are required",
                });
            }
            const history = await this.keywordService.getRankingHistory(organizationId, domain, keyword, parseInt(days));
            return (0, responseService_1.resSender)(res, 200, 'success', `Success`, null, { keyword, domain, history });
        });
        this.getSuggestions = (0, utils_1.asyncHandler)(async (req, res) => {
            const { keyword, limit = '10' } = req.query;
            const { error } = joi_1.default.object({
                keyword: validationSchema_1.default.strings,
            }).validate(req.query);
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            const suggestions = await this.keywordService.getKeywordSuggestions(keyword, parseInt(limit));
            return (0, responseService_1.resSender)(res, 200, 'success', `Success`, null, { keyword, suggestions });
        });
        this.getOverview = (0, utils_1.asyncHandler)(async (req, res) => {
            const { domain } = req.query;
            const organizationId = req.organizationId?._id;
            const { error } = joi_1.default.object({
                domain: validationSchema_1.default.strings,
            }).validate(req.query);
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            // // Get top ranking keywords
            // const topKeywords = await this.keywordService.getTopKeywords(
            //   organizationId as string,
            //   domain,
            //   10,
            // );
            // // Get ranking distribution
            // const distribution = await this.keywordService.getRankingDistribution(
            //   organizationId as string,
            //   domain,
            // );
            return (0, responseService_1.resSender)(res, 200, 'success', `Success`, null, { domain });
        });
        this.keywordService = new Services_1.KeywordService();
    }
}
exports.KeywordController = KeywordController;
