import { Request, Response } from 'express';
import { resSender } from '../../../Services/responseService';
import Joi from 'joi';
import { logger } from '../../../logger/logger';
import { isValidObjectId } from 'mongoose';
import { Website } from '../../../Models/Website';
import { asyncHandler } from '../../../helpers/utils';
import { CustomRequest } from '../../../Types/CustomRequest';

/**
 * List all websites with pagination
 */
export const getAllWebsites = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = (req.user as any)._id;
    const orgId = req.organizationId?._id;

    const { error } = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).default(10),
      status: Joi.string().valid('draft', 'published', 'archived').optional(),
    }).validate(req.query);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    if (!isValidObjectId(userId)) {
      return resSender(res, 400, 'fail', 'Invalid user ID');
    }

    let query: any = { orgId };
    if (status) query.status = status;

    const websites = await Website.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('createdBy', 'name email');
    // .populate("updatedBy", "name email");

    const total = await Website.countDocuments(query);

    let data = {
      websites,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    };

    return resSender(res, 200, 'success', 'Pages fetched successfully', null, data);
  } catch (error: any) {
    console.error('Error fetching pages:', error);
    return resSender(res, 500, 'error', error.message || 'Failed to fetch pages');
  }
});
