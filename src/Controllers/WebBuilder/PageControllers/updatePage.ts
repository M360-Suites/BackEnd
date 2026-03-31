import { Request, Response } from "express";
import { Page } from "../../../Models/Website";
import { resSender } from "../../../Services/responseService";
import { asyncHandler } from "../../../helpers/utils";
import { CustomRequest } from "../../../Types/CustomRequest";

/**
 * Update a page
 */
export const updatePage = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { updates } = req.body;
      const userId = (req.user as any)._id;

      // Don't allow changing the slug if it's provided
      if (updates.slug) {
        delete updates.slug;
      }

      const updatedPage = await Page.findByIdAndUpdate(
        id,
        {
          ...updates,
          updatedBy: userId,
          updatedAt: new Date(),
        },
        { new: true, runValidators: true }
      );

      if (!updatedPage) {
        return resSender(res, 404, "error", "Page not found");
      }

      return resSender(
        res,
        200,
        "success",
        "Page updated successfully",
        null,
        updatedPage
      );
    } catch (error: any) {
      return resSender(
        res,
        500,
        "error",
        error.message || "Failed to update page"
      );
    }
  }
);
