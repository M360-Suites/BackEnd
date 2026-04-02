import { Request, Response } from 'express';
import { logger } from '../../../logger/logger';
import { resSender } from '../../../Services/responseService';
import Joi from 'joi';
import validationSchema from '../../../Services/validationSchema';
import { Subscriber } from '../../../Models/Campaign';
import { extractEmails, getUsersNameFromEmail } from '../../../Services/emailExtraction';
import { Document } from 'mongoose';
import { asyncHandler } from '../../../helpers/utils';
import { CustomRequest } from '../../../Types/CustomRequest';

export const removeContacts = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const { error } = Joi.object({
      ids: Joi.array().items(validationSchema.objectId).required(),
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    const { ids } = req.body;
    if (!ids || ids.length < 1) return resSender(res, 400, 'fail', 'Emails addresses is required');

    await Subscriber.deleteMany({
      subscribee: req.organizationId?._id,
      _id: { $in: ids },
    });

    return resSender(res, 200, 'success', 'Contacts removed successfully');
  } catch (error) {
    console.error(`Error removing contacts: ${error}`);
    return resSender(res, 500, 'error', 'Internal server error');
  }
});
