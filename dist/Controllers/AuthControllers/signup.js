"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTrial = exports.signup = void 0;
const logger_1 = require("../../logger/logger");
const responseService_1 = require("../../Services/responseService");
require("../../Services/validationSchema");
const joi_1 = __importDefault(require("joi"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../../Models/User");
const validationSchema_1 = __importDefault(require("../../Services/validationSchema"));
const tokenService_1 = require("../../Services/tokenService");
const otpService_1 = require("../../Services/otpService");
const utils_1 = require("../../helpers/utils");
const BillingService_1 = require("../../Services/BillingService");
const jwtAccess = process.env.ACCESS_SECRET;
const storeDetails = new Map();
/**
 * @param name Company Name
 * @param email Company Email
 * @param url? Company url
 * @param password Password
 * @param token Email Verification token
 */
exports.signup = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { name, email, url, password, token, org } = req.body;
        const validSchema = joi_1.default.object({
            name: validationSchema_1.default.name,
            email: validationSchema_1.default.email,
            url: validationSchema_1.default.text,
            password: validationSchema_1.default.password,
            token: validationSchema_1.default.strings,
            org: joi_1.default.boolean().required(),
        });
        const { error } = validSchema.validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        logger_1.logger.info("Validation Successful");
        // Verify email is not already used
        const existingMail = await User_1.User.findOne({ email: email });
        if (existingMail)
            return (0, responseService_1.resSender)(res, 403, "fail", "Email Address is already in use");
        // Check token validity
        const decoded = await (0, tokenService_1.verifyToken)(token, jwtAccess);
        // console.log("Decoded payload: ", decoded);
        if (!decoded)
            return (0, responseService_1.resSender)(res, 403, "fail", "Validation Token is invalid");
        // Hash User's Password
        let saltOrRound = 10;
        let salt = bcryptjs_1.default.genSaltSync(saltOrRound);
        const hashedPwd = await bcryptjs_1.default.hash(password, salt);
        const newUser = new User_1.User({
            name: name,
            url: url,
            email: decoded.email === email && email,
            password: hashedPwd,
            emailVerified: decoded.emailVerified,
        });
        await newUser.save();
        if (org) {
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial
            const newOrg = await BillingService_1.billingService.createOrganizationWithTrial(name, email, newUser._id);
            await User_1.Membership.create({
                userId: newUser._id,
                organizationId: newOrg._id,
                role: "owner",
                status: "active",
                invitedBy: newUser._id,
                invitedAt: new Date(Date.now()),
                acceptedAt: new Date(Date.now()),
            });
        }
        return (0, responseService_1.resSender)(res, 200, "success", "User Created Successfully");
    }
    catch (error) {
        logger_1.logger.error("Failed to sign up: ", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Server Error");
    }
});
// Controller to request for a trial period
/**
 * @param email in the body of the request
 * @returns response
 */
exports.startTrial = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { email } = req.body;
        const { error } = joi_1.default.object({
            email: validationSchema_1.default.email,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        const existingMail = await User_1.User.findOne({ email: email });
        if (existingMail)
            return (0, responseService_1.resSender)(res, 403, "fail", "Email Address is already in use");
        let emailSent = await (0, otpService_1.createAndSendOtp)(email, "trial");
        return (0, responseService_1.resSender)(res, 200, "success", "Verification Code sent successfully");
    }
    catch (error) {
        logger_1.logger.error("Failed to request for trial: ", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Server Error");
    }
});
