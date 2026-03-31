import { Request, Response } from "express";
import { Page } from "../../../Models/Website";
import { resSender } from "../../../Services/responseService";
import Joi from "joi";
import validationSchema from "../../../Services/validationSchema";
import { asyncHandler } from "../../../helpers/utils";
import { CustomRequest } from "../../../Types/CustomRequest";

/**
 * Publish a page
 */
export const publishPage = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any)._id;
      const orgId = req.organizationId?._id;

      const { error } = Joi.object({
        id: validationSchema.objectId,
      }).validate(req.params);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const page = await Page.findByIdAndUpdate(
        id,
        {
          status: "published",
          updatedBy: userId,
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (!page) {
        return resSender(res, 404, "error", "Page not found");
      }

      return resSender(
        res,
        200,
        "success",
        "Page published successfully",
        null,
        page
      );
    } catch (error: any) {
      return resSender(
        res,
        500,
        "error",
        error.message || "Failed to publish page"
      );
    }
  }
);
