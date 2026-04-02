import { Request, Response } from 'express';
import { logger } from '../../logger/logger';
import { resSender } from '../../Services/responseService';
import Media, { IMedia } from '../../Models/Media';
import sharp from 'sharp';
import validationSchema from '../../Services/validationSchema';
import Joi from 'joi';
import { uploadFile } from '../../Services/mediaService'; // Import Cloudinary upload service
import { asyncHandler } from '../../helpers/utils';
import { CustomRequest } from '../../Types/CustomRequest';

/**
 * Upload media files
 */
export const uploadMedia = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const userId = (req.user as any)._id;
    const orgId = req.organizationId?._id;
    const { altText, caption } = req.body;

    // Validate request body
    const { error } = Joi.object({
      altText: validationSchema.text,
      caption: validationSchema.text,
    }).validate({ altText, caption });
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    if (!req.files) {
      return resSender(res, 400, 'error', 'No file uploaded');
    }

    let files = Object.values(req.files).flat();
    let medias = [];

    for (const file of files) {
      let retries = 5; //Number of retry attempts
      let completeRetries = 0; //Counter for complete retries

      while (retries > 0) {
        try {
          // Upload file to Cloudinary
          let uploadResult;
          try {
            uploadResult = await uploadFile(file.path, {
              folder: 'uploads',
              resource_type: 'auto', // Automatically detect file type
            });
          } catch (err) {
            console.error(`Error uploading file to Cloudinary: ${err}`);
            return resSender(res, 500, 'error', 'Failed to upload file to Cloudinary');
          }

          // Generate thumbnail for images
          let thumbnailUrl = undefined;
          if (file.mimetype.startsWith('image/')) {
            const thumbnailOptions = {
              folder: 'uploads/thumbnails',
              transformation: [{ width: 300, height: 300, crop: 'fit' }],
            };

            try {
              const thumbnailResult = await uploadFile(file.path, thumbnailOptions);
              thumbnailUrl = thumbnailResult.secure_url;
            } catch (err) {
              console.error(`Error generating thumbnail: ${err}`);
              return resSender(res, 500, 'error', 'Failed to generate thumbnail');
            }
          }

          // Get image dimensions if it's an image
          let dimensions = {};
          if (file.mimetype.startsWith('image/')) {
            const image = sharp(file.path);
            const metadata = await image.metadata();
            dimensions = {
              width: metadata.width,
              height: metadata.height,
            };
          }

          // Create media record
          const newMedia: IMedia = new Media({
            filename: uploadResult.public_id,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            path: uploadResult.secure_url,
            url: uploadResult.secure_url,
            thumbnailUrl,
            altText,
            caption,
            createdBy: userId,
            org: orgId,
            dimensions,
            metadata: uploadResult,
          });

          const savedMedia = await newMedia.save();
          let mediaData = {
            _id: savedMedia._id,
            url: savedMedia.url,
          };
          medias.push(mediaData);

          break; // Exit the loop if no error
        } catch (err: any) {
          completeRetries++;
          retries--;
          console.error(`Error processing file: ${err}`);

          if (retries === 0) {
            throw new Error(`Failed to upload file after ${completeRetries} attempts`);
          }

          // Wait for a brief period before retrying
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    }

    return resSender(res, 201, 'success', 'Media uploaded successfully', null, medias);
  } catch (error: any) {
    console.error(`Error uploading media: ${error}`);
    return resSender(res, 500, 'error', error.message || 'Failed to upload media');
  }
});
