"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCampaign = void 0;
const joi_1 = __importDefault(require("joi"));
const responseService_1 = require("../../../Services/responseService");
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
const Campaign_1 = require("../../../Models/Campaign");
const newMailService_1 = require("../../../Services/newMailService");
const encryption_1 = require("../../../Services/encryption");
const utils_1 = require("../../../helpers/utils");
exports.createCampaign = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { error } = joi_1.default.object({
            type: joi_1.default.string().valid('oneTime', 'drip').required(),
            name: joi_1.default.string().required(),
            subject: joi_1.default.string().required(),
            from: joi_1.default.string().required(),
            recipients: joi_1.default.array().items(validationSchema_1.default.objectId).required(),
            contents: joi_1.default.array().items(joi_1.default.string()).required(),
            links: joi_1.default.array().items(joi_1.default.string()).optional(),
            files: joi_1.default.array().items(validationSchema_1.default.objectId).optional(),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const { type, name, subject, recipients, contents, files, links } = req.body;
        let userCred;
        //   Implement email campaign logic
        try {
            userCred = await Campaign_1.EmailCredential.findOne({
                orgId: req.organizationId?._id,
            });
            if (!userCred)
                return (0, responseService_1.resSender)(res, 403, 'fail', 'System not authorized! Please authenticate the platform to perform this action ');
            // Decrypt token fields ONCE before looping
            const decryptedUserCred = {
                ...userCred.toObject(), // Convert Mongoose doc to plain object
                accessToken: userCred.accessToken ? (0, encryption_1.decrypt)(userCred.accessToken) : undefined,
                refreshToken: userCred.refreshToken ? (0, encryption_1.decrypt)(userCred.refreshToken) : undefined,
                smtpPassword: userCred.smtpPassword ? (0, encryption_1.decrypt)(userCred.smtpPassword) : undefined,
            };
            const fetchRec = await Campaign_1.Subscriber.find({ _id: { $in: recipients } });
            const recipientEmails = fetchRec.map((rec) => {
                return rec.email;
            });
            console.log('Recipents: ', recipientEmails);
            //  // Temp: Append links to the content
            //  for (const link in links) {
            //   contents[0].append(links[link]);
            //  }
            const emailSender = new newMailService_1.UnifiedMailService();
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
        }
        catch (mailErr) {
            console.log('Error sending mails: ', mailErr);
            throw new Error(mailErr.message);
        }
        const newCampaign = new Campaign_1.Campaign({
            org: req.organizationId?._id,
            type: type === 'oneTime' ? Campaign_1.CampaignType.oneTime : Campaign_1.CampaignType.drip,
            name,
            subject,
            from: userCred.email,
            contents,
            recipients,
            files: files ? files : null,
            links: links ? links : null,
        });
        await newCampaign.save();
        return (0, responseService_1.resSender)(res, 200, 'success', 'Campaign created successfully', null, newCampaign);
    }
    catch (error) {
        console.error('Error creating campaign:', error);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Error creating campaign');
    }
});
