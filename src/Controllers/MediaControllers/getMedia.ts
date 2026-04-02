import { Request, Response } from 'express';
import { logger } from '../../logger/logger';
import { resSender } from '../../Services/responseService';
import { isValidObjectId } from 'mongoose';
import Media, { IMedia } from '../../Models/Media';
import Joi from 'joi';
import validationSchema from '../../Services/validationSchema';
import { asyncHandler } from '../../helpers/utils';
import { CustomRequest } from '../../Types/CustomRequest';

/**
 * Get media by ID
 */
export const getMedia = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = Joi.object({
      id: validationSchema.objectId,
    }).validate(req.params);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    if (!isValidObjectId(id)) {
      return resSender(res, 400, 'error', 'Invalid media ID');
    }

    const media = await Media.findById(id);

    if (!media) {
      return resSender(res, 404, 'error', 'Media not found');
    }

    return resSender(res, 200, 'success', 'Media retrieved successfully', null, media);
  } catch (error: any) {
    console.error(`Error fetching media: ${error}`);
    return resSender(res, 500, 'error', error.message || 'Failed to fetch media');
  }
});
