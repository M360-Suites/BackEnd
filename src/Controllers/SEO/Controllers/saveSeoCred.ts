import { Request, Response } from "express";
import { asyncHandler } from "../../../helpers/utils";
import { resSender } from "../../../Services/responseService";
import Joi from "joi";
import validationSchema from "../../../Services/validationSchema";
import { SeoCredModel } from "../../../Models/SEOModels";
import { encrypt } from "../../../Services/encryption";
import { CustomRequest } from "../../../Types/CustomRequest";

export const saveSEOCred = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const userId = (req.user as any)._id;
      const {
        gaPropertyId,
        gaApiSecret,
        gaMeasurementId,
        clarityApiKey,
        clarityProjectId,
        url,
      } = req.body;

      const { error } = Joi.object({
        gaPropertyId: validationSchema.strings,
        gaApiSecret: validationSchema.strings,
        gaMeasurementId: validationSchema.strings,
        clarityProjectId: validationSchema.strings,
        clarityApiKey: validationSchema.strings,
        url: validationSchema.url,
      }).validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const seoCred = new SeoCredModel({
        userId,
        microsoftClarity: {
          projectId: clarityProjectId,
          apiKey: encrypt(clarityApiKey),
        },
        googleAnalytics: {
          propertyId: gaPropertyId,
          apiSecret: encrypt(gaApiSecret),
          measurementId: gaMeasurementId,
        },
        url,
      });
      await seoCred.save();

      return resSender(res, 200, "success", "Data saved successfully");
    } catch (error: any) {
      console.log("Error saving credentials: ", error.message);
      return resSender(res, 500, "error", error.message || "Error saving...");
    }
  },
);
