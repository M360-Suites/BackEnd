import { Request, Response } from "express";
import validationSchema from "../../../Services/validationSchema";
import Joi from "joi";
import { resSender } from "../../../Services/responseService";
import { Website } from "../../../Models/Website";
import { Organization, User } from "../../../Models/User";
import { asyncHandler } from "../../../helpers/utils";
import { CustomRequest } from "../../../Types/CustomRequest";

export const deleteWebsite = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any)._id;
      const orgId = (req.organizationId)?._id;

      // Validate the ID
      const { error } = Joi.object({
        id: validationSchema.objectId,
      }).validate(req.params);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      // Find and delete the website
      const deletedWebsite = await Website.findByIdAndDelete(id);

      if (!deletedWebsite) {
        return resSender(res, 404, "error", "Website not found");
      }

      // Also remove the website reference from the user
      await Organization.findByIdAndUpdate(
        orgId,
        { $pull: { websites: id } },
        { new: true }
      );

      return resSender(
        res,
        200,
        "success",
        "Website deleted successfully",
        null,
        deletedWebsite
      );
    } catch (error: any) {
      return resSender(
        res,
        500,
        "error",
        error.message || "Failed to delete website"
      );
    }
  }
);
