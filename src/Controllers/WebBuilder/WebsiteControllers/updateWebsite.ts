import { Request, Response } from "express";
import { Website } from "../../../Models/Website";
import { resSender } from "../../../Services/responseService";
import { logger } from "../../../logger/logger";
import { asyncHandler } from "../../../helpers/utils";
import { CustomRequest } from "../../../Types/CustomRequest";

export const updateWebsite = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { updates } = req.body;
      const userId = (req.user as any)._id;

      // Don't allow changing the slug if it's provided
      if (updates.slug) {
        delete updates.slug;
      }

      const updatedWebsite = await Website.findByIdAndUpdate(
        id,
        {
          ...updates,
          updatedBy: userId,
          updatedAt: new Date(),
        },
        { new: true, runValidators: true }
      );

      if (!updatedWebsite) {
        return resSender(res, 404, "error", "Website not found");
      }

      return resSender(
        res,
        200,
        "success",
        "Website updated successfully",
        null,
        updatedWebsite
      );
    } catch (error: any) {
      logger.error("Error updating website: ", error);
      return resSender(
        res,
        500,
        "error",
        error.message || "Failed to update website"
      );
    }
  }
);
