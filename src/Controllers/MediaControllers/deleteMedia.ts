import { Request, Response } from 'express';
import { logger } from '../../logger/logger';
import { resSender } from '../../Services/responseService';
import { isValidObjectId } from 'mongoose';
import Media, { IMedia } from '../../Models/Media';
import fs from 'fs';
import path from 'path';
import validationSchema from '../../Services/validationSchema';
import Joi from 'joi';
import { asyncHandler } from '../../helpers/utils';
import { CustomRequest } from '../../Types/CustomRequest';

/**
 * Delete media
 */
export const deleteMedia = asyncHandler(async (req: CustomRequest, res: Response) => {
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

    // Delete the file from storage
    try {
      if (fs.existsSync(media.path)) {
        fs.unlinkSync(media.path);
      }
      if (media.thumbnailUrl) {
        const thumbnailPath = path.join(__dirname, '../../../public', media.thumbnailUrl);
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      }
    } catch (fileError) {
      console.error(`Error deleting media file: ${fileError}`);
    }

    await Media.findByIdAndDelete(id);

    return resSender(res, 200, 'success', 'Media deleted successfully');
  } catch (error: any) {
    console.error(`Error deleting media: ${error}`);
    return resSender(res, 500, 'error', error.message || 'Failed to delete media');
  }
});
