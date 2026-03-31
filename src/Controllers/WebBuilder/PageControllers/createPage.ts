import { Request, Response } from "express";
import { logger } from "../../../logger/logger";
import { resSender } from "../../../Services/responseService";
import { isValidObjectId, Types } from "mongoose";
import { Website, IPage, Page } from "../../../Models/Website";
import Media from "../../../Models/Media";
import Joi from "joi";
import validationSchema from "../../../Services/validationSchema";
import { asyncHandler } from "../../../helpers/utils";
import { CustomRequest } from "../../../Types/CustomRequest";

/**
 * Create a new page
 */
export const createPage = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const {
        title,
        content,
        status,
        seo,
        websiteId,
        featuredImageId,
        mediaIds,
      } = req.body;
      const userId = (req.user as any)._id;
      const orgId = req.organizationId?._id;

      if (!isValidObjectId(websiteId))
        return resSender(res, 400, "error", "Invalid website ID");

      const { error } = Joi.object({
        title: validationSchema.title,
        content: validationSchema.text,
        status: Joi.string().valid("draft", "published"),
        seo: Joi.object().optional(),
        websiteId: validationSchema.objectId,
        featuredImageId: validationSchema.objectId.optional(),
        mediaIds: Joi.array().items(validationSchema.objectId).optional(),
      }).validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);
      logger.info("Validation Successful");

      // Validate featured image if provided
      if (featuredImageId && !isValidObjectId(featuredImageId)) {
        return resSender(res, 400, "error", "Invalid featured image ID");
      }

      // Validate media IDs if provided
      if (mediaIds && Array.isArray(mediaIds)) {
        for (const mediaId of mediaIds) {
          if (!isValidObjectId(mediaId)) {
            return resSender(res, 400, "error", `Invalid media ID: ${mediaId}`);
          }
        }
      }

      // Check if website exists
      logger.info("Website Id: ", websiteId);
      const website = await Website.findById(websiteId);
      if (!website) return resSender(res, 404, "error", "Website not found");

      // Check if featured image exists if provided
      if (featuredImageId) {
        const featuredImage = await Media.findById(featuredImageId);
        if (!featuredImage) {
          return resSender(res, 404, "error", "Featured image not found");
        }
      }

      // Check if all media items exist if provided
      if (mediaIds && mediaIds.length > 0) {
        const mediaItems = await Media.find({ _id: { $in: mediaIds } });
        if (mediaItems.length !== mediaIds.length) {
          return resSender(
            res,
            404,
            "error",
            "One or more media items not found"
          );
        }
      }

      // Generate slug from title
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const newPage: IPage = new Page({
        websiteId,
        title,
        slug,
        content,
        status: status || "draft",
        seo: seo || {},
        featuredImage: featuredImageId || undefined,
        media: mediaIds || [],
        org: orgId,
        createdBy: userId,
        updatedBy: userId,
      });

      // Check for duplicate slug
      const existingPage = await Page.findOne({
        websiteId,
        slug,
      });
      if (existingPage) {
        return resSender(
          res,
          409,
          "fail",
          "Page with this slug already exists"
        );
      }
      // Save the new page
      const savedPage = await newPage.save();

      if (!savedPage) return resSender(res, 403, "fail", "Unable to save page");
      website.pages.push(savedPage?._id as any);
      await website.save();

      // Update media items to mark them as used
      if (featuredImageId) {
        await Media.findByIdAndUpdate(featuredImageId, { isUsed: true });
      }
      if (mediaIds && mediaIds.length > 0) {
        await Media.updateMany({ _id: { $in: mediaIds } }, { isUsed: true });
      }

      return resSender(
        res,
        201,
        "success",
        "Page created successfully",
        null,
        savedPage
      );
    } catch (error: any) {
      logger.error(`Error creating page: ${error}`);
      return resSender(
        res,
        500,
        "error",
        error.message || "Failed to create page"
      );
    }
  }
);
