import { Request, Response } from 'express';
import { logger } from '../../logger/logger';
import { resSender } from '../../Services/responseService';
import { Membership, User } from '../../Models/User';
import bcrypt from 'bcryptjs';
import { generateToken, saveCookies } from '../../Services/tokenService';
import { modifyUserResponse } from '../../Services/modifyUserResponse';
import Joi from 'joi';
import validationSchema from '../../Services/validationSchema';
import { CustomRequest } from '../../Types/CustomRequest';

const jwtAccess = process.env.ACCESS_SECRET as string;
const jwtRefresh = process.env.REFRESH_SECRET as string;

export const signIn = async (req: CustomRequest, res: Response) => {
  try {
    // logger.info("Sign In Controller");
    const { email, password } = req.body;
    const { error } = Joi.object({
      email: validationSchema.email,
      password: validationSchema.password,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    if (!email || !password) {
      return resSender(res, 400, 'fail', 'Email and password are required');
    }

    // Check if the user exists
    const user = await User.findOne({ email: email });
    if (!user) {
      return resSender(res, 403, 'fail', 'Invalid Credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return resSender(res, 403, 'fail', 'Invalid Credentials');
    }

    // Generate a JWT token
    let payload = {
      userId: user._id as string,
      email: user.email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      generateToken(payload, jwtAccess, {
        expiresIn: '10m',
      }),
      generateToken(payload, jwtRefresh as string, {
        expiresIn: '7d',
      }),
    ]);

    let org = (
      await Membership.findOne({ userId: user._id, status: 'active' }).populate('organizationId')
    )?.organizationId;

    await saveCookies(res, 'rfst_tkn', refreshToken);
    return resSender(res, 200, 'success', 'Sign In Successful', null, {
      user: modifyUserResponse(user),
      accessToken,
      defaultOrg: org,
    });
  } catch (error: any) {
    console.error('Error in signIn controller:', error);
    return resSender(res, 500, 'error', error.message || 'Server Error');
  }
};
