import { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils';
import { resSender } from '../../Services/responseService';
import Joi from 'joi';
import validationSchema from '../../Services/validationSchema';
import { retrieveSetting } from './getAllSettings';
import { Settings } from '../../Models/Settings';
import { NotificationType } from '../../Types/settings';
import { AdsConModel } from '../../Models/AdModels';
import { SocialConnectionModel } from '../../Models/SocialModels';
import { CommunityConnection } from '../../Models/CommunityModels';
import oauthService from '../SocialScheduler/Auth/oauth-service';
import adsOauth from '../AdsManager/Auth/ads-oauth';
import comOauth from '../CommunityManager/Auth/oauth';
import { Currency } from '../../Types/payment';
import { CustomRequest } from '../../Types/CustomRequest';

export const saveAll = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    console.log('Trying');
  } catch (error: any) {
    console.log('Error saving settings:', error.message);
    return resSender(res, 500, 'error', 'Failed', error.message || 'Failed to save settings');
  }
});

export const saveGeneral = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const userId = (req.user as any)._id;

    const { language, currency, timezone, dateFormat } = req.body;
    const { error } = Joi.object({
      language: validationSchema.strings,
      currency: validationSchema.strings.valid(...Object.values(Currency)),
      timezone: validationSchema.strings,
      dateFormat: validationSchema.strings,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    let setting = await retrieveSetting(userId);

    setting!.general = {
      language,
      timezone,
      currency,
      dateFormat,
    };
    await setting?.save();

    return resSender(res, 200, 'success', 'Setting saved');
  } catch (error: any) {
    console.log('Error saving general setting:', error.message);
    return resSender(res, 500, 'error', 'Failed', error.message || 'Failed to save');
  }
});

export const saveNotification = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const userId = (req.user as any)._id;

    const { email, sms, push, notificationType } = req.body;
    const { error } = Joi.object({
      email: Joi.bool(),
      sms: Joi.bool(),
      push: Joi.bool(),
      notificationType: Joi.array().items(Joi.string().valid(...Object.values(NotificationType))),
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    let setting = await retrieveSetting(userId);

    setting!.notifications = {
      email,
      sms,
      push,
      notificationType,
    };
    await setting?.save();

    return resSender(res, 200, 'success', 'Setting saved');
  } catch (error: any) {
    console.log('Error saving notification setting:', error.message);
    return resSender(res, 500, 'error', 'Failed', error.message || 'Failed to save');
  }
});

export const saveDomain = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const userId = (req.user as any)._id;

    const { domain, favIcon, logo } = req.body;
    const { error } = Joi.object({
      domain: validationSchema.strings,
      favIcon: validationSchema.strings,
      logo: validationSchema.strings,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    let setting = await retrieveSetting(userId);
    setting!.domain = {
      domain,
      favIcon,
      logo,
    };
    await setting?.save();

    return resSender(res, 200, 'success', 'Setting saved');
  } catch (error: any) {
    console.log('Error saving domain setting:', error.message);
    return resSender(res, 500, 'error', 'Failed', error.message || 'Failed to save');
  }
});

export const saveEmail = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const userId = (req.user as any)._id;
    const { email, allowAdsNotoification, allowSocialNotifications } = req.body;
    const { error } = Joi.object({
      email: validationSchema.email,
      allowAdsNotoification: Joi.bool(),
      allowSocialNotifications: Joi.bool(),
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    let setting = await retrieveSetting(userId);
    setting!.email = {
      connectedEmail: email,
      adsNotification: allowAdsNotoification,
      socialsNotification: allowSocialNotifications,
    };
    await setting?.save();

    return resSender(res, 200, 'success', 'Setting saved');
  } catch (error: any) {
    console.log('Error saving email setting:', error.message);
    return resSender(res, 500, 'error', 'Failed', error.message || 'Failed to save');
  }
});

export const saveAds = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const userId = (req.user as any)._id;

    const { postingTime, timeZone } = req.body;
    const { error } = Joi.object({
      postingTime: Joi.date().required(),
      timeZone: validationSchema.strings,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    let setting = await Settings.findOneAndUpdate(
      { userId },
      {
        adAndSocials: {
          preferences: {
            postingTime,
            timeZone,
          },
        },
      },
      { upsert: true },
    );

    return resSender(res, 200, 'success', 'Setting saved');
  } catch (error: any) {
    console.log('Error saving ads setting:', error.message);
    return resSender(res, 500, 'error', 'Failed', error.message || 'Failed to save');
  }
});

export const saveCommunity = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const userId = (req.user as any)._id;

    const { autoDeleteSpams, contentModeration, userApproval, autoSyncPosts } = req.body;
    const { error } = Joi.object({
      autoSyncPosts: Joi.boolean(),
      autoDeleteSpams: Joi.boolean(),
      contentModeration: Joi.boolean(),
      userApproval: Joi.boolean(),
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    let setting = await Settings.findOneAndUpdate(
      { userId },
      {
        community: {
          preferences: {
            userApproval,
            contentModeration,
            autoDeleteSpams,
            autoSyncPosts,
          },
        },
      },
      { upsert: true },
    );

    return resSender(res, 200, 'success', 'Setting saved');
  } catch (error: any) {
    console.log('Error saving ads setting:', error.message);
    return resSender(res, 500, 'error', 'Failed', error.message || 'Failed to save');
  }
});

export const saveSecurity = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const userId = (req.user as any)._id;

    const { enable2FA } = req.body;
    const { error } = Joi.object({
      enable2FA: Joi.boolean(),
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    let setting = await Settings.findOneAndUpdate(
      { userId },
      {
        security: {
          enable2FA,
        },
      },
      { upsert: true },
    );

    return resSender(res, 200, 'success', 'Setting saved');
  } catch (error: any) {
    console.log('Error saving ads setting:', error.message);
    return resSender(res, 500, 'error', 'Failed', error.message || 'Failed to save');
  }
});

export const removeAdsAccount = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const userId = (req.user as any)._id;

    const { accountId } = req.params;
    const { error } = Joi.object({
      accountId: validationSchema.objectId,
    }).validate(req.params);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    let connection = await AdsConModel.findOne({ userId, _id: accountId });
    if (!connection) return resSender(res, 403, 'fail', 'Connected account not found!');
    await adsOauth.revokeConnection(connection);

    return resSender(res, 200, 'success', 'Account removed');
  } catch (error: any) {
    console.log('Error removing ads account:', error.message);
    return resSender(res, 500, 'error', 'Failed', error.message || 'Failed to remove ads account');
  }
});

export const removeSocialAccount = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const userId = (req.user as any)._id;

    const { accountId } = req.params;
    const { error } = Joi.object({
      accountId: validationSchema.objectId,
    }).validate(req.params);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    let connection = await SocialConnectionModel.findOne({
      userId,
      _id: accountId,
    });
    if (!connection) return resSender(res, 403, 'fail', 'Connected account not found!');
    await oauthService.revokeConnection(connection);

    return resSender(res, 200, 'success', 'Account removed');
  } catch (error: any) {
    console.log('Error removing ads account:', error.message);
    return resSender(res, 500, 'error', 'Failed', error.message || 'Failed to remove ads account');
  }
});

export const removeComAccount = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const userId = (req.user as any)._id;

    const { accountId } = req.params;
    const { error } = Joi.object({
      accountId: validationSchema.objectId,
    }).validate(req.params);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    let connection = await CommunityConnection.findOne({
      userId,
      _id: accountId,
    });
    if (!connection) return resSender(res, 403, 'fail', 'Connected account not found!');
    await comOauth.revokeConnection(connection);

    return resSender(res, 200, 'success', 'Account removed');
  } catch (error: any) {
    console.log('Error removing ads account:', error.message);
    return resSender(res, 500, 'error', 'Failed', error.message || 'Failed to remove ads account');
  }
});
