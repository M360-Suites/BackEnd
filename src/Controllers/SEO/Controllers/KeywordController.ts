import { Request, Response } from "express";
import { CustomRequest } from '../../../Types/CustomRequest';
import { asyncHandler } from "../../../helpers/utils";
import { KeywordService } from "../Services";
import { resSender } from "../../../Services/responseService";
import Joi from "joi";
import validationSchema from "../../../Services/validationSchema";

export class KeywordController {
  private keywordService: KeywordService;

  constructor() {
    this.keywordService = new KeywordService();
  }

  addKeywords = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { domain, keywords, location = "us" } = req.body;
    const organizationId = req.organizationId?._id;

    const { error } = Joi.object({
      domain: validationSchema.strings,
      keywords: Joi.array().items(Joi.string().required()).min(1).required(),
      // location:
    }).validate(req.body);
    if (error) return resSender(res, 400, "fail", error.details[0].message);

    if (!domain || !keywords || !Array.isArray(keywords)) {
      return res.status(400).json({
        error: "Domain and keywords array are required",
      });
    }

    await this.keywordService.trackMultipleKeywords(
      organizationId as string,
      domain,
      keywords,
      location,
    );

    return resSender(res, 200, 'success', `Tracking ${keywords.length} keywords for ${domain}`, null, keywords);
  });

  getRankings = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { domain, keyword, days = '30' } = req.query as unknown as {domain: string; keyword: string; days: string};
    const organizationId = req.organizationId?._id;

    const { error } = Joi.object({
      domain: validationSchema.strings,
      keyword: validationSchema.strings,
      // location:
    }).validate(req.query);
    if (error) return resSender(res, 400, "fail", error.details[0].message);

    if (!domain || !keyword) {
      return res.status(400).json({
        error: "Domain and keyword are required",
      });
    }

    const history = await this.keywordService.getRankingHistory(
      organizationId as string,
      domain,
      keyword,
      parseInt(days),
    );

    return resSender(res, 200, 'success', `Success`, null, {keyword, domain, history});
  });

  getSuggestions = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { keyword, limit = '10' } = req.query as {keyword: string; limit: string};

    const { error } = Joi.object({
      keyword: validationSchema.strings,
    }).validate(req.query);
    if (error) return resSender(res, 400, "fail", error.details[0].message);

    const suggestions = await this.keywordService.getKeywordSuggestions(
      keyword,
      parseInt(limit),
    );

    return resSender(res, 200, 'success', `Success`, null, {keyword, suggestions});
  });

  getOverview = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { domain } = req.query;
    const organizationId = req.organizationId?._id;

    const { error } = Joi.object({
      domain: validationSchema.strings,
    }).validate(req.query);
    if (error) return resSender(res, 400, "fail", error.details[0].message);

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

    return resSender(res, 200, 'success', `Success`, null, {domain});
  });
}
