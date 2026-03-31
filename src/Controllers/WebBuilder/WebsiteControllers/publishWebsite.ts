import { Request, Response } from "express";
import { resSender } from "../../../Services/responseService";
import Joi from "joi";
import validationSchema from "../../../Services/validationSchema";
import { Website } from "../../../Models/Website";
import { asyncHandler } from "../../../helpers/utils";
import { CustomRequest } from "../../../Types/CustomRequest";

/**
 * Publish a website
 */
export const publishWebsite = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any)._id;

      const { error } = Joi.object({
        id: validationSchema.objectId,
      }).validate(req.params);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const website = await Website.findByIdAndUpdate(
        id,
        {
          status: "published",
            updatedBy: userId,
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (!website) {
        return resSender(res, 404, "error", "website not found");
      }

      return resSender(
        res,
        200,
        "success",
        "website published successfully",
        null,
        website
      );
    } catch (error: any) {
      return resSender(
        res,
        500,
        "error",
        error.message || "Failed to publish website"
      );
    }
  }
);
