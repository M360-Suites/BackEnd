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
 * Update media metadata
 */
export const updateMedia = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { altText, caption, isUsed } = req.body;

    // Validate req params and body
    const { error } = Joi.object({
      id: validationSchema.objectId,
      altText: validationSchema.text,
      caption: validationSchema.text,
      isUsed: Joi.boolean().optional(),
    }).validate({ id, altText, caption, isUsed });
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    if (!isValidObjectId(id)) {
      return resSender(res, 400, 'error', 'Invalid media ID');
    }

    const updates: Partial<IMedia> = {};
    if (altText !== undefined) updates.altText = altText;
    if (caption !== undefined) updates.caption = caption;
    if (isUsed !== undefined) updates.isUsed = isUsed;

    const updatedMedia = await Media.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!updatedMedia) {
      return resSender(res, 404, 'error', 'Media not found');
    }

    return resSender(res, 200, 'success', 'Media updated successfully', null, updatedMedia);
  } catch (error: any) {
    console.error(`Error updating media: ${error}`);
    return resSender(res, 500, 'error', error.message || 'Failed to update media');
  }
});
