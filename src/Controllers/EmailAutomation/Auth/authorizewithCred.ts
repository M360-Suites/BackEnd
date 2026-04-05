import { Request, Response } from 'express';
import { logger } from '../../../logger/logger';
import { resSender } from '../../../Services/responseService';
import Joi from 'joi';
import validationSchema from '../../../Services/validationSchema';
import dns from 'dns/promises';
import passport from 'passport';
import { EmailCredential } from '../../../Models/Campaign';
import { encrypt } from '../../../Services/encryption';
import axios, { AxiosError } from 'axios';
import { User } from '../../../Models/User';
import MailOauthService, { MailPlatform, MailRes } from './MailOauth';
import MailAuthService from './MailOauth';
import MailOauth from './MailOauth';
import { extractErrorMessage } from '../../../helpers/axiosError';
import { asyncHandler } from '../../../helpers/utils';
import { CustomRequest } from '../../../Types/CustomRequest';

export const detectProvider = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const { email } = req.body;
    const { error } = Joi.object({
      email: validationSchema.email,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    let domain = email.split('@')[1];
    let provider = 'custom';

    const mxRecords = (await dns.resolveMx(domain)).sort((a, b) => a.priority - b.priority);
    const exchanges = mxRecords.map((r) => r.exchange.toLowerCase());

    // console.log("MxRecords: ", mxRecords);
    // console.log("Exchanges: ", exchanges);

    if (exchanges.some((mx) => mx.includes('google'))) provider = 'google';
    if (exchanges.some((mx) => mx.includes('outlook') || mx.includes('microsoft')))
      provider = 'microsoft';
    if (exchanges.some((mx) => mx.includes('zoho'))) provider = 'zoho';

    return resSender(res, 200, 'success', 'Provider detected successfully!', provider);
  } catch (error: any) {
    console.error('Could not resolve email domain: ', error);
    return resSender(res, 500, 'error', error.message || 'Could not resolve email domain');
  }
});

export const getAuthUrl = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    console.log('Got auth url req');
    const { error } = Joi.object({
      platform: Joi.string().required().valid('google', 'microsoft', 'zoho'),
    }).validate(req.params);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    const { platform } = req.params;
    const orgId = req.organizationId?._id;
    console.log('Got: ', { orgId, platform });

    if (!Object.values(MailPlatform).includes(platform as MailPlatform)) {
      return resSender(res, 400, 'fail', 'Invalid platform');
    }

    const { url: authUrl, csrfState } = MailAuthService.generateAuthUrl(
      platform as MailPlatform,
      orgId as string,
    );
    console.log('AUth Url: ', authUrl);
    // res.json({ authUrl });
    res.cookie('csrfState', csrfState, { maxAge: 60000 });

    // return res.redirect(authUrl);

    return resSender(res, 200, 'success', 'Connect successful!', null, authUrl);
  } catch (error: any) {
    console.error('Error getting Oauth2 url: ', error);
    return resSender(res, 500, 'error', error.message || 'Error getting Oauth2 url');
  }
});

export const handleCallback = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    console.log('Callback received');
    const { code, state, location } = req.query;

    if (!code || !state) return resSender(res, 400, 'fail', 'Missing code or state parameter');

    const { platform, orgId } = MailOauth.parseState(state as string);

    console.log('Queries are: ', { code, state, location });
    let result: MailRes;

    if (platform === MailPlatform.ZOHO) {
      result = await zohoConsent(code as string, orgId, location as string);
    } else {
      result = await MailOauthService.handleCallback(code as string, state as string);
    }
    console.log('Res: ', result);

    let con = await EmailCredential.findOneAndUpdate(
      { orgId: result.orgId, provider: result.provider },
      {
        orgId: result.orgId,
        provider: result.provider,
        email: result.email,
        accessToken: encrypt(result.accessToken),
        refreshToken: result.refreshToken ? encrypt(result.refreshToken) : undefined,
        providerId: result.accountId,
        accountName: result.accountName,
        expiresAt: result.expiresAt ? new Date(Date.now() + result.expiresAt * 1000) : undefined,
      },
      { upsert: true },
    );

    return resSender(res, 200, 'success', 'Connect successful!');
  } catch (error: any) {
    console.log('Error in auth: ', error);
    return resSender(
      res,
      500,
      'error',
      error.message || 'Error occured while connecting to platform.',
    );
  }
});

/**
 * Handles OAuth callback and exchanges code for tokens
 * @param code Authorization code from callback
 * @param orgId req user's organization id parsed from state parameter
 * @param location location parameter from callback
 * @returns MailRes object
 */
export const zohoConsent = async (code: string, orgId: string, location: string) => {
  let serverUrl =
    process.env.NODE_ENV === 'development' ? process.env.SERVER_URL : process.env.PROD_URL;
  let clientUrl = process.env.CLIENT_URL!;

  try {
    // console.log("Query Data: ", { code, location });

    // Determine the correct token endpoint based on location
    const tokenEndpoint =
      location === 'eu'
        ? 'https://accounts.zoho.eu/oauth/v2/token'
        : location === 'in'
          ? 'https://accounts.zoho.in/oauth/v2/token'
          : 'https://accounts.zoho.com/oauth/v2/token';

    const { data } = await axios.post(tokenEndpoint, null, {
      params: {
        code,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        redirect_uri: `${clientUrl}/mail-auth/callback`,
        grant_type: 'authorization_code',
        scope: 'ZohoMail.messages.CREATE,ZohoMail.accounts.READ',
      },
    });

    console.log('Data Res: ', data);

    const accessToken = data.access_token;
    const refreshToken = data.refresh_token ? data.refresh_token : null;
    const expiresAt = data.expires_in;

    if (!refreshToken) {
      throw new Error('No refresh token received from Zoho');
    }

    // Get user info
    const userInfo = await axios.get('https://accounts.zoho.com/oauth/user/info', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    console.log('User info: ', userInfo.data);

    const userEmail = userInfo.data.Email;
    if (!userEmail) throw new Error('No email found in Zoho response');

    // Get mail accounts - use the correct regional endpoint
    const mailEndpoint =
      location === 'eu'
        ? 'https://mail.zoho.eu/api/accounts'
        : location === 'in'
          ? 'https://mail.zoho.in/api/accounts'
          : 'https://mail.zoho.com/api/accounts';

    const accountsResponse = await axios.get(mailEndpoint, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });

    if (!accountsResponse.data.data || accountsResponse.data.data.length === 0) {
      throw new Error('No Zoho Mail accounts found. Please set up a Zoho Mail account first.');
    }

    // Use the first account ID (most users will only have one)
    const accountId = accountsResponse.data.data[0].accountId;
    const accountName = accountsResponse.data.data[0].accountName;
    console.log('Accounts: ', JSON.stringify(accountsResponse.data.data));

    let result: MailRes = {
      accessToken,
      refreshToken,
      accountId,
      email: userEmail,
      provider: 'zoho' as MailPlatform,
      orgId,
      accountName,
      expiresAt,
    };

    return result;
  } catch (error: any) {
    console.error('Zoho consent error:', error.response?.data?.data?.moreInfo || error.message);
    let errorMessage =
      error.response?.data?.data?.moreInfo ||
      error.message ||
      extractErrorMessage(error as AxiosError);
    throw new Error(`OAuth callback failed for zoho: ${errorMessage || error.message}`);
  }
};

// export const googleConsent = asyncHandler(async (req: any, res: Response) => {
//   try {
//     const user = req.user as any;
//     // console.log('Google Request: ',  req);
//     console.log('Google');
//     console.log("user: ", user);

//     let orgId = await User.findOne({ email: user.email });
//     if (!orgId)
//       return resSender(
//         res,
//         404,
//         "fail",
//         "User not found! Please register first"
//       );

//     if (!orgId.googleId) orgId.googleId = user.profile.id;
//     await orgId.save();

//     await EmailCredential.findOneAndUpdate(
//       { orgId: orgId._id, provider: "google" },
//       {
//         orgId: orgId._id,
//         provider: "google",
//         email: user.email,
//         accessToken: encrypt(user.accessToken),
//         refreshToken: encrypt(user.refreshToken),
//         providerId: user.profile.id,
//       },
//       { upsert: true }
//     );

//     return resSender(res, 200, "success", "Google consent successful!");
//   } catch (error: any) {
//     console.log("Error connecting to provider: ", error);
//     return resSender(
//       res,
//       500,
//       "error",
//       error.message || "Error connecting to provider"
//     );
//   }
// });

// export const microsoftConsent = asyncHandler(
//   async (req: any, res: Response) => {
//     try {
//       const user = req.user as any;
//       // console.log("Microsoft User: ", user);
//       if (!user?.email) {
//         throw new Error("Microsoft OAuth failed: No email found");
//       }

//       const appUser = await User.findOne({ email: user?.email });
//       if (!appUser)
//         return resSender(
//           res,
//           403,
//           "fail",
//           "User not found! Please register first"
//         );

//       await EmailCredential.findOneAndUpdate(
//         { orgId: appUser._id, provider: "microsoft" },
//         {
//           orgId: appUser._id,
//           provider: "microsoft",
//           email: user.email,
//           providerId: user.id,
//           accessToken: encrypt(user.accessToken),
//           refreshToken: encrypt(user.refreshToken),
//         },
//         { upsert: true }
//       );

//       return resSender(res, 200, "success", "Microsoft consent successful!");
//     } catch (error: any) {
//       console.error("Error connecting to provider: ", error);
//       return resSender(
//         res,
//         500,
//         "error",
//         error.message || "Error connecting to provider"
//       );
//     }
//   }
// );

export const authWithProvider = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const { error } = Joi.object({
      provider: Joi.string().valid('custom').required(),
      email: validationSchema.email,
      smtpHost: Joi.string().required(),
      smtpPort: Joi.number().required(),
      smtpSecure: Joi.boolean().required(),
      smtpPassword: Joi.string().required(),
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    const { provider, email, smtpHost, smtpPort, smtpSecure, smtpPassword } = req.body;

    const newCred = new EmailCredential({
      orgId: req.organizationId?._id,
      provider,
      email,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpPassword: encrypt(smtpPassword),
    });
    await newCred.save();

    return resSender(res, 200, 'success', 'Operation successful!');
  } catch (error: any) {
    console.error('Error connecting to provider: ', error);
    return resSender(res, 500, 'error', error.message || 'Error connecting to provider');
  }
});
