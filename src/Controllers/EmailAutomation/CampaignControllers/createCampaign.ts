import { Request, Response } from 'express';
import { logger } from '../../../logger/logger';
import Joi from 'joi';
import { resSender } from '../../../Services/responseService';
import validationSchema from '../../../Services/validationSchema';
import { Campaign, CampaignType, EmailCredential, Subscriber } from '../../../Models/Campaign';
import { sendEmail, UnifiedMailService } from '../../../Services/newMailService';
import { decrypt } from '../../../Services/encryption';
import { asyncHandler } from '../../../helpers/utils';
import { CustomRequest } from '../../../Types/CustomRequest';

export const createCampaign = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const { error } = Joi.object({
      type: Joi.string().valid('oneTime', 'drip').required(),
      name: Joi.string().required(),
      subject: Joi.string().required(),
      from: Joi.string().required(),
      recipients: Joi.array().items(validationSchema.objectId).required(),
      contents: Joi.array().items(Joi.string()).required(),
      links: Joi.array().items(Joi.string()).optional(),
      files: Joi.array().items(validationSchema.objectId).optional(),
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    const { type, name, subject, recipients, contents, files, links } = req.body;
    let userCred;

    //   Implement email campaign logic
    try {
      userCred = await EmailCredential.findOne({
        orgId: req.organizationId?._id,
      });
      if (!userCred)
        return resSender(
          res,
          403,
          'fail',
          'System not authorized! Please authenticate the platform to perform this action ',
        );

      // Decrypt token fields ONCE before looping
      const decryptedUserCred = {
        ...userCred.toObject(), // Convert Mongoose doc to plain object
        accessToken: userCred.accessToken ? decrypt(userCred.accessToken) : undefined,
        refreshToken: userCred.refreshToken ? decrypt(userCred.refreshToken) : undefined,
        smtpPassword: userCred.smtpPassword ? decrypt(userCred.smtpPassword) : undefined,
      };

      const fetchRec = await Subscriber.find({ _id: { $in: recipients } });
      const recipientEmails = fetchRec.map((rec) => {
        return rec.email;
      });
      console.log('Recipents: ', recipientEmails);

      //  // Temp: Append links to the content
      //  for (const link in links) {
      //   contents[0].append(links[link]);
      //  }

      const emailSender = new UnifiedMailService();
      for (const mail of recipientEmails) {
        console.log('Mail: ', mail);
        let emailData = {
          to: mail,
          subject,
          body: contents[0],
        };
        // let mailResp = await sendEmail(userCred, mail, subject, contents[0]);
        const validation = emailSender.validateEmailDataOnly(userCred, emailData);
        if (!validation.valid) {
          console.log('Validation errors:', validation.errors);
          return; // Don't send the email
        }
        const messageId = await emailSender.sendEmail(userCred, emailData);
        console.log('Response from Mail: ', messageId);
      }
    } catch (mailErr: any) {
      console.log('Error sending mails: ', mailErr);
      throw new Error(mailErr.message);
    }

    const newCampaign = new Campaign({
      org: req.organizationId?._id,
      type: type === 'oneTime' ? CampaignType.oneTime : CampaignType.drip,
      name,
      subject,
      from: userCred.email,
      contents,
      recipients,
      files: files ? files : null,
      links: links ? links : null,
    });
    await newCampaign.save();

    return resSender(res, 200, 'success', 'Campaign created successfully', null, newCampaign);
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    return resSender(res, 500, 'error', error.message || 'Error creating campaign');
  }
});
