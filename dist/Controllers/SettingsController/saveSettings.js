"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeComAccount = exports.removeSocialAccount = exports.removeAdsAccount = exports.saveSecurity = exports.saveCommunity = exports.saveAds = exports.saveEmail = exports.saveDomain = exports.saveNotification = exports.saveGeneral = exports.saveAll = void 0;
const utils_1 = require("../../helpers/utils");
const responseService_1 = require("../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../Services/validationSchema"));
const getAllSettings_1 = require("./getAllSettings");
const Settings_1 = require("../../Models/Settings");
const settings_1 = require("../../Types/settings");
const AdModels_1 = require("../../Models/AdModels");
const SocialModels_1 = require("../../Models/SocialModels");
const CommunityModels_1 = require("../../Models/CommunityModels");
const oauth_service_1 = __importDefault(require("../SocialScheduler/Auth/oauth-service"));
const ads_oauth_1 = __importDefault(require("../AdsManager/Auth/ads-oauth"));
const oauth_1 = __importDefault(require("../CommunityManager/Auth/oauth"));
const payment_1 = require("../../Types/payment");
exports.saveAll = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        console.log('Trying');
    }
    catch (error) {
        console.log('Error saving settings:', error.message);
        return (0, responseService_1.resSender)(res, 500, 'error', 'Failed', error.message || 'Failed to save settings');
    }
});
exports.saveGeneral = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const { language, currency, timezone, dateFormat } = req.body;
        const { error } = joi_1.default.object({
            language: validationSchema_1.default.strings,
            currency: validationSchema_1.default.strings.valid(...Object.values(payment_1.Currency)),
            timezone: validationSchema_1.default.strings,
            dateFormat: validationSchema_1.default.strings,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        let setting = await (0, getAllSettings_1.retrieveSetting)(userId);
        setting.general = {
            language,
            timezone,
            currency,
            dateFormat,
        };
        await setting?.save();
        return (0, responseService_1.resSender)(res, 200, 'success', 'Setting saved');
    }
    catch (error) {
        console.log('Error saving general setting:', error.message);
        return (0, responseService_1.resSender)(res, 500, 'error', 'Failed', error.message || 'Failed to save');
    }
});
exports.saveNotification = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const { email, sms, push, notificationType } = req.body;
        const { error } = joi_1.default.object({
            email: joi_1.default.bool(),
            sms: joi_1.default.bool(),
            push: joi_1.default.bool(),
            notificationType: joi_1.default.array().items(joi_1.default.string().valid(...Object.values(settings_1.NotificationType))),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        let setting = await (0, getAllSettings_1.retrieveSetting)(userId);
        setting.notifications = {
            email,
            sms,
            push,
            notificationType,
        };
        await setting?.save();
        return (0, responseService_1.resSender)(res, 200, 'success', 'Setting saved');
    }
    catch (error) {
        console.log('Error saving notification setting:', error.message);
        return (0, responseService_1.resSender)(res, 500, 'error', 'Failed', error.message || 'Failed to save');
    }
});
exports.saveDomain = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const { domain, favIcon, logo } = req.body;
        const { error } = joi_1.default.object({
            domain: validationSchema_1.default.strings,
            favIcon: validationSchema_1.default.strings,
            logo: validationSchema_1.default.strings,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        let setting = await (0, getAllSettings_1.retrieveSetting)(userId);
        setting.domain = {
            domain,
            favIcon,
            logo,
        };
        await setting?.save();
        return (0, responseService_1.resSender)(res, 200, 'success', 'Setting saved');
    }
    catch (error) {
        console.log('Error saving domain setting:', error.message);
        return (0, responseService_1.resSender)(res, 500, 'error', 'Failed', error.message || 'Failed to save');
    }
});
exports.saveEmail = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const { email, allowAdsNotoification, allowSocialNotifications } = req.body;
        const { error } = joi_1.default.object({
            email: validationSchema_1.default.email,
            allowAdsNotoification: joi_1.default.bool(),
            allowSocialNotifications: joi_1.default.bool(),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        let setting = await (0, getAllSettings_1.retrieveSetting)(userId);
        setting.email = {
            connectedEmail: email,
            adsNotification: allowAdsNotoification,
            socialsNotification: allowSocialNotifications,
        };
        await setting?.save();
        return (0, responseService_1.resSender)(res, 200, 'success', 'Setting saved');
    }
    catch (error) {
        console.log('Error saving email setting:', error.message);
        return (0, responseService_1.resSender)(res, 500, 'error', 'Failed', error.message || 'Failed to save');
    }
});
exports.saveAds = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const { postingTime, timeZone } = req.body;
        const { error } = joi_1.default.object({
            postingTime: joi_1.default.date().required(),
            timeZone: validationSchema_1.default.strings,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        let setting = await Settings_1.Settings.findOneAndUpdate({ userId }, {
            adAndSocials: {
                preferences: {
                    postingTime,
                    timeZone,
                },
            },
        }, { upsert: true });
        return (0, responseService_1.resSender)(res, 200, 'success', 'Setting saved');
    }
    catch (error) {
        console.log('Error saving ads setting:', error.message);
        return (0, responseService_1.resSender)(res, 500, 'error', 'Failed', error.message || 'Failed to save');
    }
});
exports.saveCommunity = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const { autoDeleteSpams, contentModeration, userApproval, autoSyncPosts } = req.body;
        const { error } = joi_1.default.object({
            autoSyncPosts: joi_1.default.boolean(),
            autoDeleteSpams: joi_1.default.boolean(),
            contentModeration: joi_1.default.boolean(),
            userApproval: joi_1.default.boolean(),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        let setting = await Settings_1.Settings.findOneAndUpdate({ userId }, {
            community: {
                preferences: {
                    userApproval,
                    contentModeration,
                    autoDeleteSpams,
                    autoSyncPosts,
                },
            },
        }, { upsert: true });
        return (0, responseService_1.resSender)(res, 200, 'success', 'Setting saved');
    }
    catch (error) {
        console.log('Error saving ads setting:', error.message);
        return (0, responseService_1.resSender)(res, 500, 'error', 'Failed', error.message || 'Failed to save');
    }
});
exports.saveSecurity = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const { enable2FA } = req.body;
        const { error } = joi_1.default.object({
            enable2FA: joi_1.default.boolean(),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        let setting = await Settings_1.Settings.findOneAndUpdate({ userId }, {
            security: {
                enable2FA,
            },
        }, { upsert: true });
        return (0, responseService_1.resSender)(res, 200, 'success', 'Setting saved');
    }
    catch (error) {
        console.log('Error saving ads setting:', error.message);
        return (0, responseService_1.resSender)(res, 500, 'error', 'Failed', error.message || 'Failed to save');
    }
});
exports.removeAdsAccount = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const { accountId } = req.params;
        const { error } = joi_1.default.object({
            accountId: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        let connection = await AdModels_1.AdsConModel.findOne({ userId, _id: accountId });
        if (!connection)
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Connected account not found!');
        await ads_oauth_1.default.revokeConnection(connection);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Account removed');
    }
    catch (error) {
        console.log('Error removing ads account:', error.message);
        return (0, responseService_1.resSender)(res, 500, 'error', 'Failed', error.message || 'Failed to remove ads account');
    }
});
exports.removeSocialAccount = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const { accountId } = req.params;
        const { error } = joi_1.default.object({
            accountId: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        let connection = await SocialModels_1.SocialConnectionModel.findOne({
            userId,
            _id: accountId,
        });
        if (!connection)
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Connected account not found!');
        await oauth_service_1.default.revokeConnection(connection);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Account removed');
    }
    catch (error) {
        console.log('Error removing ads account:', error.message);
        return (0, responseService_1.resSender)(res, 500, 'error', 'Failed', error.message || 'Failed to remove ads account');
    }
});
exports.removeComAccount = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const { accountId } = req.params;
        const { error } = joi_1.default.object({
            accountId: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        let connection = await CommunityModels_1.CommunityConnection.findOne({
            userId,
            _id: accountId,
        });
        if (!connection)
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Connected account not found!');
        await oauth_1.default.revokeConnection(connection);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Account removed');
    }
    catch (error) {
        console.log('Error removing ads account:', error.message);
        return (0, responseService_1.resSender)(res, 500, 'error', 'Failed', error.message || 'Failed to remove ads account');
    }
});
