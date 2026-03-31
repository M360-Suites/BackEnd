import { Request, Response } from "express";
import { resSender } from "../../../Services/responseService";
import { isValidObjectId } from "mongoose";
import { Page, IPage } from "../../../Models/Website";
import Joi from "joi";
import validationSchema from "../../../Services/validationSchema";
import { logger } from "../../../logger/logger";
import { asyncHandler } from "../../../helpers/utils";
import { CustomRequest } from "../../../Types/CustomRequest";

/**
 * Get a single page by ID or slug
 */
export const getPage = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { error } = Joi.object({
        id: validationSchema.objectId,
      }).validate(req.params);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      let page: IPage | null = null;

      if (isValidObjectId(id)) {
        page = await Page.findById(id);
      } else {
        return resSender(res, 400, "error", "Invalid page ID");
      }

      if (!page) {
        return resSender(res, 404, "error", "Page not found");
      }

      return resSender(
        res,
        200,
        "success",
        "Page fetched successfully",
        null,
        page
      );
    } catch (error: any) {
      logger.error("Error fetching page:", error);
      return resSender(
        res,
        500,
        "error",
        error.message || "Failed to fetch page"
      );
    }
  }
);
