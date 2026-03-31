import { Request, Response } from "express";
import { logger } from "../../logger/logger";
import { resSender } from "../../Services/responseService";
import Media, { IMedia } from "../../Models/Media";
import Joi from "joi";
import { asyncHandler } from "../../helpers/utils";
import { CustomRequest } from "../../Types/CustomRequest";

/**
 * List all media with pagination
 */
export const listMedia = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { page = 1, limit = 20, mimeType } = req.query;
      const userId = (req.user as any)._id;
      const orgId = req.organizationId?._id;

      const { error } = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).default(20),
        mimeType: Joi.string()
          .valid("image", "video", "audio", "document")
          .optional(),
      }).validate(req.query);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const query: any = { org: orgId };
      if (mimeType) {
        if (mimeType === "image") {
          query.mimeType = { $regex: /^image\// };
        } else if (mimeType === "video") {
          query.mimeType = { $regex: /^video\// };
        } else {
          query.mimeType = mimeType;
        }
      }

      const media = await Media.find(query)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await Media.countDocuments(query);

      return resSender(res, 200, "success", "Media list retrieved", null, {
        media,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      logger.error(`Error listing media: ${error}`);
      return resSender(
        res,
        500,
        "error",
        error.message || "Failed to list media"
      );
    }
  }
);
