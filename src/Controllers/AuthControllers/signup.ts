import { NextFunction, Request, Response } from 'express';
import { logger } from '../../logger/logger';
import { resSender } from '../../Services/responseService';
require('../../Services/validationSchema');
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import { Membership, Organization, User } from '../../Models/User';
import validationSchema from '../../Services/validationSchema';
import { generateToken, verifyToken } from '../../Services/tokenService';
import Otp from '../../Models/Otp';
import { sendMail } from '../../Services/mailService';
import { forgetPassword } from '../../Mails/otpMail';
import { createAndSendOtp, verifyOtp } from '../../Services/otpService';
import { addDays } from 'date-fns';
import { asyncHandler } from '../../helpers/utils';
import { CustomRequest } from '../../Types/CustomRequest';
import { BillingStatus } from '../../Types/payment';
import { billingService } from '../../Services/BillingService';

const jwtAccess = process.env.ACCESS_SECRET as string;

const storeDetails = new Map();

/**
 * @param name Company Name
 * @param email Company Email
 * @param url? Company url
 * @param password Password
 * @param token Email Verification token
 */
export const signup = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const { name, email, url, password, token, org } = req.body;
    const validSchema = Joi.object({
      name: validationSchema.name,
      email: validationSchema.email,
      url: validationSchema.text,
      password: validationSchema.password,
      token: validationSchema.strings,
      org: Joi.boolean().required(),
    });
    const { error } = validSchema.validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);
    logger.info('Validation Successful');

    // Verify email is not already used for both org and user
    let existingMail;
    if (org) {
      existingMail = await Organization.findOne({ email });
    } else {
      existingMail = await User.findOne({ email });
    }
    if (existingMail) return resSender(res, 403, 'fail', 'Email Address is already in use');

    // Check token validity
    const decoded: any = await verifyToken(token, jwtAccess);
    // console.log("Decoded payload: ", decoded);
    if (!decoded) return resSender(res, 403, 'fail', 'Validation Token is invalid');
    if (decoded.email !== email)
      return resSender(res, 403, 'fail', 'Email does not match provided token!');

    // Hash User's Password
    let saltOrRound = 10;
    let salt = bcrypt.genSaltSync(saltOrRound);
    const hashedPwd = await bcrypt.hash(password, salt);

    const newUser = new User({
      name: name,
      url: url,
      email: email,
      password: hashedPwd,
      emailVerified: decoded.emailVerified,
    });
    await newUser.save();

    if (org) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial
      const newOrg = await billingService.createOrganizationWithTrial(
        name,
        email,
        newUser._id as string,
      );

      await Membership.create({
        userId: newUser._id,
        organizationId: newOrg._id,
        role: 'owner',
        status: 'active',
        invitedBy: newUser._id,
        invitedAt: new Date(Date.now()),
        acceptedAt: new Date(Date.now()),
      });
    }

    return resSender(res, 200, 'success', `${org ? 'Org' : 'User'} Created Successfully`);
  } catch (error: any) {
    console.error('Failed to sign up: ', error);
    return resSender(res, 500, 'error', error.message || 'Server Error');
  }
});

// Controller to request for a trial period
/**
 * @param email in the body of the request
 * @returns response
 */
export const startTrial = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const { email } = req.body;
    const { error } = Joi.object({
      email: validationSchema.email,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    const existingMail = await User.findOne({ email: email }) || await Organization.findOne({ email });
    if (existingMail) return resSender(res, 403, 'fail', 'Email Address is already in use');

    let emailSent = await createAndSendOtp(email, 'trial');
    if (emailSent.includes('not')) return resSender(res, 400, 'fail', 'Email not sent, try again!');

    return resSender(res, 200, 'success', 'Verification Code sent successfully');
  } catch (error: any) {
    console.error('Failed to request for trial: ', error);
    return resSender(res, 500, 'error', error.message || 'Server Error');
  }
});
