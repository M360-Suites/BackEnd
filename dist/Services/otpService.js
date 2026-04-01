"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtp = exports.createAndSendOtp = void 0;
const Otp_1 = __importDefault(require("../Models/Otp"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const otpMail_1 = require("../Mails/otpMail");
const logger_1 = require("../logger/logger");
const tokenService_1 = require("./tokenService");
const newMailService_1 = require("./newMailService");
const jwtAccess = process.env.ACCESS_SECRET;
/**
 *
 * @param email
 * @param reason
 * @returns state - boolean value
 */
const createAndSendOtp = async (email, reason = "trial") => {
    try {
        let verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        let otpRecord = await Otp_1.default.findOne({ email, reason });
        // Hash the OTP before storing
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedOTP = await bcryptjs_1.default.hash(verificationCode, salt);
        if (otpRecord) {
            otpRecord.otp = hashedOTP;
            //   otpRecord.expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString; //Update the expires time
        }
        else {
            otpRecord = new Otp_1.default({
                email,
                otp: hashedOTP,
                reason,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Set expiration time
            });
        }
        await otpRecord.save();
        console.log("Code: ", verificationCode);
        // Select email template and subject based on reason
        let emailSubject = "";
        let emailContent;
        // Filter email template based on reason
        switch (reason) {
            case "forgotPassword":
                emailSubject = "Password Reset Request";
                emailContent = (0, otpMail_1.forgetPassword)({
                    firstName: email,
                    otp: verificationCode,
                });
                break;
            case "verifyEmail":
                emailSubject = "Email Verification";
                emailContent = (0, otpMail_1.trialMail)({ firstName: email, otp: verificationCode });
                break;
            case "trial":
                emailSubject = "Free Trial Verification";
                emailContent = (0, otpMail_1.trialMail)({ firstName: email, otp: verificationCode }); // Using forgetPassword as fallback
                break;
            default:
                emailSubject = "Verification Code";
                emailContent = (0, otpMail_1.forgetPassword)({
                    firstName: email,
                    otp: verificationCode,
                }); // Default to forgetPassword
        }
        let sent = false;
        await (0, newMailService_1.sendMail)(email, emailSubject, emailContent, process.env.NOREPLY_EMAIL)
            .then(() => {
            logger_1.logger.info("Email Sent");
            sent = true;
        })
            .catch((err) => {
            logger_1.logger.info("Email not Sent");
            sent = false;
            console.log('Error: ', err);
            throw err;
        });
        return sent;
    }
    catch (error) {
        console.log('Error');
        throw error;
    }
};
exports.createAndSendOtp = createAndSendOtp;
/**
 *
 * @param code The recieved code from user
 * @param email User's email adddress
 * @param reason Reason for code request and verification
 * @returns Token to authenticate the next action
 */
const verifyOtp = async (code, email, reason) => {
    try {
        let savedOtp = await Otp_1.default.findOne({ email, reason });
        if (!savedOtp)
            throw new Error("Verification code is invalid or expired");
        const isExpired = new Date(savedOtp.expiresAt) < new Date();
        if (isExpired) {
            await Otp_1.default.deleteOne({ _id: savedOtp._id });
            throw new Error("Verification code is invalid or expired");
        }
        const isValid = await bcryptjs_1.default.compare(code, savedOtp.otp);
        if (!isValid)
            throw new Error("Verification code is invalid or expired");
        let payload = {
            userId: '',
            email,
            emailVerified: reason === "trial",
        };
        // console.log('Payload: ', payload);
        const token = (0, tokenService_1.generateToken)(payload, jwtAccess, {
            expiresIn: reason == "trial" ? "365d" : "10m",
        });
        return token;
    }
    catch (error) {
        console.log('Error');
        throw error;
    }
};
exports.verifyOtp = verifyOtp;
