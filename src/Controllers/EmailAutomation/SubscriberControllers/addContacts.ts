import { Request, Response } from 'express';
import { logger } from '../../../logger/logger';
import { resSender } from '../../../Services/responseService';
import Joi from 'joi';
import validationSchema from '../../../Services/validationSchema';
import { Subscriber } from '../../../Models/Campaign';
import { extractEmails, getUsersNameFromEmail } from '../../../Services/emailExtraction';
import { Document } from 'mongoose';
import { Organization, User } from '../../../Models/User';
import { asyncHandler } from '../../../helpers/utils';
import { CustomRequest } from '../../../Types/CustomRequest';

export const addContacts = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const { error } = Joi.object({
      emails: Joi.array().items(validationSchema.email).optional(),
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    const { emails } = req.body;
    if (!emails && !req.file)
      return resSender(res, 400, 'fail', 'Emails addresses or email file is required');

    let contacts: Document[] = [];
    if (emails) {
      console.log('Emails: ', emails);
      emails.map(async (email: string) => {
        // let name = (await getUsersNameFromEmail(email)).name;
        let newContact = new Subscriber({
          subscribee: req.organizationId?._id,
          email,
          name: 'Unknown Name',
          status: 'Active',
        });
        contacts.push(newContact);
      });
    }
    // console.log("Contacts 1: ", contacts);

    // If a file is uploaded, extract emails from the file
    if (req.file) {
      const filePath = req.file.path;
      const fetchedEmails = await extractEmails(filePath);
      console.log('Fetched Emails: ', fetchedEmails);

      fetchedEmails.map(async (email: string) => {
        // let name = (await getUsersNameFromEmail(email)).name;
        let newContact = new Subscriber({
          subscribee: req.organizationId?._id,
          email,
          name: 'Unknown Name',
          status: 'Active',
        });
        contacts.push(newContact);
      });
    }
    console.log('Contacts: ', contacts);

    if (contacts.length < 1) return resSender(res, 400, 'fail', 'No contacts to add');
    if (contacts.length > 1000)
      return resSender(res, 400, 'fail', 'You can only add a maximum of 1000 contacts at a time');

    // await Promise.all(
    await Subscriber.insertMany(contacts);
    await Organization.findByIdAndUpdate(
      req.organizationId?._id,
      { $set: { emailAutoOnboarding: 2 } },
      { new: true },
    );
    // );

    return resSender(res, 200, 'success', 'Contacts added successfully', null, contacts);
  } catch (error: any) {
    console.error('Error adding contacts:', error);
    return resSender(res, 500, 'error', error.message || 'Error adding contacts');
  }
});
