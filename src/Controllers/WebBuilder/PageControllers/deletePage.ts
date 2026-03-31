import { Request, Response } from "express";
import { resSender } from "../../../Services/responseService";
import Joi from "joi";
import validationSchema from "../../../Services/validationSchema";
import { Page } from "../../../Models/Website";
import { asyncHandler } from "../../../helpers/utils";
import { CustomRequest } from "../../../Types/CustomRequest";

/**
 * Delete a page
 */
export const deletePage = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { error } = Joi.object({
        id: validationSchema.objectId,
      }).validate(req.params);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const deletedPage = await Page.findByIdAndDelete(id);

      if (!deletedPage) {
        return resSender(res, 404, "error", "Page not found");
      }

      // Optionally, you can also delete associated media if needed
      // await Media.deleteMany({ _id: { $in: deletedPage.mediaIds } });
      return resSender(res, 200, "success", "Page deleted successfully");
    } catch (error: any) {
      console.error("Error deleting page:", error);
      return resSender(res, 500, "error", error.message || "Server error");
    }
  }
);
