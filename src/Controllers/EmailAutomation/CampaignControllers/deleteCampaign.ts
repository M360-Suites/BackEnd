import { Request, Response } from "express";
import { logger } from "../../../logger/logger";
import { resSender } from "../../../Services/responseService";
import Joi from "joi";
import validationSchema from "../../../Services/validationSchema";
import { Campaign } from "../../../Models/Campaign";
import { asyncHandler } from "../../../helpers/utils";
import { CustomRequest } from "../../../Types/CustomRequest";

export const deleteCampaigns = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { error } = Joi.object({
        ids: Joi.array().items(validationSchema.objectId).required(),
      }).validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const { ids } = req.body;
      const orgId = req.organizationId?._id;
      if (!ids || ids.length < 1)
        return resSender(res, 400, "fail", "Campaign IDs are required");

      const deletedCampaigns = await Campaign.deleteMany({
        org: orgId,
        _id: { $in: ids },
      });
      if (deletedCampaigns.deletedCount === 0)
        return resSender(res, 404, "fail", "No campaigns found to delete");

      return resSender(res, 200, "success", "Campaigns deleted successfully");
    } catch (error: any) {
      logger.error("Error deleting campaign:", error);
      return resSender(
        res,
        500,
        "error",
        error.message || "Error deleting campaigns"
      );
    }
  }
);
