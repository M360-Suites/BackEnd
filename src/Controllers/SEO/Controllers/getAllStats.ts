import { Request, Response } from "express";
import { asyncHandler } from "../../../helpers/utils";
import { resSender } from "../../../Services/responseService";
import Joi from "joi";
import validationSchema from "../../../Services/validationSchema";
import { SEOService } from "../Services/seo";
import { ClarityDimensions, SEOConfig } from "../../../Types/seo";
import { MicrosoftClarityService } from "../Services/seo/MicrosoftClarity";
import { getUserCreds } from "../Services/getUserCred";
import { CustomRequest } from "../../../Types/CustomRequest";

export const getAllStats = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const userId = (req.user as any)._id;
      // console.log('UserId: ', userId);

      const { url } = req.body;

      const { error } = Joi.object({
        url: validationSchema.url,
      }).validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);
      // const seoCred = await SeoCred

      return resSender(res, 200, "success", "Successful");
    } catch (error: any) {
      return resSender(res, 500, "error", error.message);
    }
  }
);

export const analyzeSite = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const userId = (req.user as any)._id;
      const { url } = req.query;
      const { error } = Joi.object({
        url: validationSchema.url,
      }).validate(req.query);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const config: SEOConfig = await getUserCreds(userId, url as string);

      console.log("Dets: ", { url, key: config.pageSpeed.apiKey });

      const seoClass = new SEOService(config);

      // const pageSPeedService = seoClass.getServices().pageSpeed;

      // const result0 = await pageSPeedService.analyzeUrlComprehensive(url as string);

      const result = await seoClass.analyzeSEO(url as string);

      return resSender(res, 200, "success", "Success", null, result);
    } catch (error: any) {
      console.log("Error analyzing site: ", error.message);
      return resSender(res, 500, "error", error.message || "Error");
    }
  }
);

export const getSiteClarityData = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { dimensions } = req.body;

      console.log("Body: ", req.body);
      const { error } = Joi.object({
        dimensions: Joi.array().items(Joi.string()),
      }).validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      let apiKey =
        "eyJhbGciOiJSUzI1NiIsImtpZCI6IjQ4M0FCMDhFNUYwRDMxNjdEOTRFMTQ3M0FEQTk2RTcyRDkwRUYwRkYiLCJ0eXAiOiJKV1QifQ.eyJqdGkiOiJmMTA3NGUwYy1jMDZhLTQzYjEtOTI2OS04MGIzMzVhODQxNTYiLCJzdWIiOiIzMDEwMTI5ODY5MTYxNzczIiwic2NvcGUiOiJEYXRhLkV4cG9ydCIsIm5iZiI6MTc2MTA5OTAxOCwiZXhwIjo0OTE0Njk5MDE4LCJpYXQiOjE3NjEwOTkwMTgsImlzcyI6ImNsYXJpdHkiLCJhdWQiOiJjbGFyaXR5LmRhdGEtZXhwb3J0ZXIifQ.i7Pv0IIbZrkAnd_kxoenPtNI2VI7QA4lqbL0SjguxbNezdTRVFfl1LdgBo4RQP83szHuhRLGfCnahhHQ3RMq-OPILiLfR28ccQywBlBaDbCxSt1s3dws_FcchIH18WGlx_PgG2FLSomwLcq-s9Liau1-N2mPkreg8Xa0osgXOzgeSuJRIF2nt2fF03eDiFGFJKWSXSpQbUoi0p2JdSlbppgLEmD2vjxThugzwB7xpPYX5BuFBMlupHtJpxCeGBxIn4-Lb61RvCsbMhq749ghhPfeBFsHwUVLs7mZIQQcxrV8aOIDLSSUz0vAyUFmoVXK_rJNiyrX58rAP_hslVFsOA";

      const clarityService = new MicrosoftClarityService("", apiKey);
      const clarityData = await clarityService.getSiteData(3, [
        ClarityDimensions.OS,
        ClarityDimensions.Browser,
      ]);

      return resSender(res, 200, "success", "Successful", null, clarityData);
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "");
    }
  }
);

// const preMetrics = response.loadingExperience;
// const lighthouse = response.lighthouseResult;
// const audits = lighthouse.audits;

// console.log("Metrics: ", preMetrics);
// console.log("Lighthouse Result: ", response.lighthouseResult);
// console.log("Audits Result: ", lighthouse.audits);
