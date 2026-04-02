import { Request, Response } from 'express';
import { resSender } from '../../../Services/responseService';
import Joi from 'joi';
import { logger } from '../../../logger/logger';
import { isValidObjectId } from 'mongoose';
import validationSchema from '../../../Services/validationSchema';
import { Website, Page, IPage } from '../../../Models/Website';
import { asyncHandler } from '../../../helpers/utils';
import { CustomRequest } from '../../../Types/CustomRequest';

/**
 * List all pages with pagination
 */
export const listPages = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const { websiteId } = req.params;

    const { error } = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).default(10),
      status: Joi.string().valid('draft', 'published').optional(),
    }).validate(req.query);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    const { error: newError } = Joi.object({
      websiteId: validationSchema.objectId,
    }).validate(req.params);

    if (!isValidObjectId(websiteId)) {
      return resSender(res, 400, 'fail', 'Invalid website ID');
    } else if (newError) {
      return resSender(res, 400, 'fail', newError.details[0].message);
    }

    // Check if the user has access to the website
    const userId = (req.user as any)._id;
    const website = await Website.findById(websiteId);
    if (!website) {
      return resSender(res, 404, 'fail', 'Website not found');
    } else if (String(website.createdBy) !== String(userId)) {
      return resSender(res, 403, 'fail', 'You do not have access to this website');
    }

    const query: any = { websiteId };
    if (status) query.status = status;

    const pages = await Page.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    const total = await Page.countDocuments(query);

    let data = {
      pages,
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
