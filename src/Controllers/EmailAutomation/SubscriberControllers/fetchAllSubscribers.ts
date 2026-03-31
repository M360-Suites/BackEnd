import { Request, Response } from "express";
import { logger } from "../../../logger/logger";
import { resSender } from "../../../Services/responseService";
import Joi from "joi";
import { Subscriber } from "../../../Models/Campaign";
import { asyncHandler } from "../../../helpers/utils";
import { CustomRequest } from "../../../Types/CustomRequest";

export const fetchAllSubscribers = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const userId = (req.user as any)._id;
      const orgId = req.organizationId?._id;
      const { page = 1, limit = 10 } = req.query;
      const { error } = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).default(10),
      }).validate(req.query);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const query: any = { subscribee: orgId };
      const subscribers = await Subscriber.find(query)
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .sort({ createdAt: -1 });
      const totalSubscribers = await Subscriber.countDocuments(query);
      const totalPages = Math.ceil(totalSubscribers / Number(limit));
      const response = {
        subscribers,
        totalSubscribers,
        totalPages,
        currentPage: Number(page),
        limit: Number(limit),
      };

      return resSender(
        res,
        200,
        "success",
        "Subscribers fetched successfully",
        null,
        response
      );
    } catch (error: any) {
      logger.error("Error fetching subscribers:", error);
      return resSender(
        res,
        500,
        "error",
        error.message || "Error fetching subscribers"
      );
    }
  }
);
