import { Request, Response } from "express";
import { resSender } from "../../../Services/responseService";
import { isValidObjectId } from "mongoose";
import { Website, IWebsite } from "../../../Models/Website";
import Joi from "joi";
import validationSchema from "../../../Services/validationSchema";
import { asyncHandler } from "../../../helpers/utils";
import { CustomRequest } from "../../../Types/CustomRequest";

/**
 * Get a single website by ID or slug
 */
export const getWebsite = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { error } = Joi.object({
        id: validationSchema.objectId,
      }).validate(req.params);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      let website: IWebsite | null = null;

      if (isValidObjectId(id)) {
        website = await Website.findById(id).populate(
          "pages",
          "_id title slug status"
        );
      } else {
        return resSender(res, 400, "error", "Invalid website ID");
      }

      if (!website) {
        return resSender(res, 404, "error", "website not found");
      }

      return resSender(
        res,
        200,
        "success",
        "website fetched successfully",
        null,
        website
      );
    } catch (error: any) {
      return resSender(
        res,
        500,
        "error",
        error.message || "Failed to fetch website"
      );
    }
  }
);
