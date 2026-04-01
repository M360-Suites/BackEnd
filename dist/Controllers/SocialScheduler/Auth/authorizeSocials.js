"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCallback = exports.initiateAuth = void 0;
const responseService_1 = require("../../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const types_1 = require("../../../Types/types");
const oauth_service_1 = __importDefault(require("./oauth-service"));
const utils_1 = require("../../../helpers/utils");
exports.initiateAuth = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { error } = joi_1.default.object({
            platform: joi_1.default.string()
                .required()
                .valid('facebook', 'instagram', 'twitter', 'youtube', 'linkedin', 'tiktok', 'pinterest'),
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const { platform } = req.params;
        const userId = req.user._id;
        const orgId = req.organizationId?._id;
        if (!Object.values(types_1.SocialPlatform).includes(platform)) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Invalid platform');
        }
        const { url: authUrl, csrfState } = oauth_service_1.default.generateAuthUrl(platform, orgId);
        console.log('AUth Url: ', authUrl);
        // res.json({ authUrl });
        res.cookie('csrfState', csrfState, { maxAge: 60000 });
        // return res.redirect(authUrl);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Connect successful!', null, authUrl);
    }
    catch (error) {
        console.log('Error in auth: ', error);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Error occured while connecting to platform.');
    }
});
exports.handleCallback = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        console.log('Callback received');
        const { code, state } = req.query;
        if (!code || !state)
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Missing code or state parameter');
        console.log('Code is: ', code);
        const connection = await oauth_service_1.default.handleCallback(code, state);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Connect successful!');
    }
    catch (error) {
        console.log('Error in auth: ', error);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Error occured while connecting to platform.');
    }
});
