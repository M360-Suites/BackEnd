"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.verifyCode = exports.sendCode = void 0;
const responseService_1 = require("../../Services/responseService");
const logger_1 = require("../../logger/logger");
const validationSchema_1 = __importDefault(require("../../Services/validationSchema"));
const joi_1 = __importDefault(require("joi"));
const User_1 = require("../../Models/User");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const otpService_1 = require("../../Services/otpService");
const tokenService_1 = require("../../Services/tokenService");
const utils_1 = require("../../helpers/utils");
const jwtAccess = process.env.ACCESS_SECRET;
/**
 * @param email Account email
 * @param reason Reason for code request
 */
exports.sendCode = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { email, reason } = req.body;
        const { error } = joi_1.default.object({
            email: validationSchema_1.default.email,
            reason: validationSchema_1.default.reason.disallow("trial"),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        const existingMail = await User_1.User.findOne({ email: email });
        if (!existingMail) {
            logger_1.logger.info("User Email does not exist");
            return (0, responseService_1.resSender)(res, 200, "success", "Verification Code will be sent to your mail, if it exists!");
        }
        const emailSent = await (0, otpService_1.createAndSendOtp)(existingMail.email, reason);
        return (0, responseService_1.resSender)(res, 200, "success", "Verification Code will be sent to your mail, if it exists!");
    }
    catch (error) {
        logger_1.logger.error("Failed to request for trial: ", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Server Error");
    }
});
/**
 * @param code This is the verification received from user's mail
 * @param email User's email address
 * @param reason Reason for code verification
 */
exports.verifyCode = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { email, code, reason } = req.body;
        const { error } = joi_1.default.object({
            email: validationSchema_1.default.email,
            code: validationSchema_1.default.strings,
            reason: validationSchema_1.default.reason,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        const token = await (0, otpService_1.verifyOtp)(code, email, reason);
        return (0, responseService_1.resSender)(res, 200, "success", "Code verified successfully!", null, token);
    }
    catch (error) {
        logger_1.logger.error("Failed to verify code: ", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Server Error");
    }
});
/**
 * @param newPassword This is the new Password that the user wants
 * @param token Token issued after code confirmation
 */
exports.resetPassword = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { newPassword, token } = req.body;
        const { error } = joi_1.default.object({
            newPassword: validationSchema_1.default.password,
            token: validationSchema_1.default.strings,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        // Validate received token
        const decoded = await (0, tokenService_1.verifyToken)(token, jwtAccess);
        console.log("Decoded Payload: ", decoded);
        // Hash the new Password
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPwd = await bcryptjs_1.default.hash(newPassword, salt);
        let user = await User_1.User.findOneAndUpdate({ email: decoded?.email }, {
            $set: {
                password: hashedPwd,
            },
        });
        if (!user)
            return (0, responseService_1.resSender)(res, 403, "fail", "Account not Found!");
        return (0, responseService_1.resSender)(res, 200, "success", "Password updated successfully!");
    }
    catch (error) {
        logger_1.logger.error("Failed to verify code: ", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Server Error");
    }
});
