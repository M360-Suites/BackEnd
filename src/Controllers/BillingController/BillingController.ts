import { Response } from "express";
import { asyncHandler } from "../../helpers/utils";
import { CustomRequest } from "../../Types/CustomRequest";
import { billingService } from "../../Services/BillingService";
import { resSender } from "../../Services/responseService";
import Joi from "joi";
import validationSchema from "../../Services/validationSchema";

export class BillingController {
  captureCard = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const organizationId = req.organizationId?._id;
      console.log('Org Id: ', organizationId);
      const { features } = req.body;

      const { error } = Joi.object({
        features: Joi.array()
          .items(
            Joi.string().valid(
              "creative_generator",
              "email_automation",
              "social_scheduler",
              "community_manager",
              "ads_manager",
              "seo_toolkit",
            ),
          )
          .unique()
          .min(1)
          .required(),
      }).validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const result = await billingService.initializeCardCapture(
        organizationId as string,
        features,
      );
      return resSender(res, 200, "success", "Successful", null, result);
    } catch (error: any) {
      console.log('Error occured: ', error);
      return resSender(res, 500, "error", error.message);
    }
  });

  completeCapture = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const { reference } = req.body;
      const organizationId = req.organizationId?._id;
      await billingService.completeCardCapture(
        organizationId as string,
        reference,
      );
      return resSender(res, 200, "success", "Successful", null);
    } catch (error: any) {
      return resSender(res, 500, "error", error.message);
    }
  });

  billingStatus = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const { organizationId } = req.params;
      const status = await billingService.checkTrialStatus(organizationId);
      return resSender(res, 200, "success", "Successful", null, status);
    } catch (error: any) {
      return resSender(res, 500, "error", error.message);
    }
  });

  subscribe = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const organizationId = req.organizationId?._id;
      const { features } = req.body;

      const { error } = Joi.object({
        features: Joi.array()
          .items(
            Joi.string().valid(
              "creative_generator",
              "email_automation",
              "social_scheduler",
              "community_manager",
              "ads_manager",
              "seo_toolkit",
            ),
          )
          .unique()
          .min(1)
          .required(),
      }).validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);
      
      await billingService.convertTrialToSubscription(
        organizationId as string,
        features,
      );
      return resSender(res, 200, "success", "Successful", null);
    } catch (error: any) {
      return resSender(res, 500, "error", error.message);
    }
  });

  upgrade = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const organizationId = req.organizationId?._id;
      const { features } = req.body;
      const { error } = Joi.object({
        features: Joi.array()
          .items(
            Joi.string().valid(
              "creative_generator",
              "email_automation",
              "social_scheduler",
              "community_manager",
              "ads_manager",
              "seo_toolkit",
            ),
          )
          .unique()
          .min(1)
          .required(),
      }).validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const result = await billingService.upgradeFeatures(
        organizationId as string,
        features,
      );
      return resSender(res, 200, "success", "Successful", null, result);
    } catch (error: any) {
      return resSender(res, 500, "error", error.message);
    }
  });

  downgrade = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const organizationId = req.organizationId?._id;
      const { features } = req.body;

      const { error } = Joi.object({
        features: Joi.array()
          .items(
            Joi.string().valid(
              "creative_generator",
              "email_automation",
              "social_scheduler",
              "community_manager",
              "ads_manager",
              "seo_toolkit",
            ),
          )
          .unique()
          .min(1)
          .required(),
      }).validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      await billingService.downgradeFeatures(organizationId as string, features);
      return resSender(
        res,
        200,
        "success",
        "Successful",
        "Downgrade scheduled for next billing cycle",
      );
      res.json({
        success: true,
        message: "Downgrade scheduled for next billing cycle",
      });
    } catch (error: any) {
      return resSender(res, 500, "error", error.message);
    }
  });
}

export const billingController = new BillingController();
