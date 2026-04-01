"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteAction = exports.editProfile = exports.getAccountDetails = exports.getAuthAccount = void 0;
const logger_1 = require("../../logger/logger");
const responseService_1 = require("../../Services/responseService");
const utils_1 = require("../../helpers/utils");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../Services/validationSchema"));
const User_1 = require("../../Models/User");
const modifyUserResponse_1 = require("../../Services/modifyUserResponse");
// import { sendMail } from "../../Services/newMailService";
// import { accountAccessMail } from "../../Mails/accessMail";
const tokenService_1 = require("../../Services/tokenService");
exports.getAuthAccount = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const user = req.user;
        return (0, responseService_1.resSender)(res, 204, "success", "Fetched!", "User account fetched", user);
    }
    catch (error) {
        logger_1.logger.error("Failed to verify code: ", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Server Error");
    }
});
exports.getAccountDetails = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        console.log("Req User: ", req.user);
        //   const userId = req.user._id;
    }
    catch (error) {
        logger_1.logger.error("Failed to verify code: ", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Server Error");
    }
});
exports.editProfile = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const { name, email, phone1, phone2, address, city, country } = req.body;
        const { error } = joi_1.default.object({
            name: validationSchema_1.default.strings,
            email: validationSchema_1.default.email,
            phone1: validationSchema_1.default.phoneNumber,
            phone2: validationSchema_1.default.phoneNumber.optional(),
            address: validationSchema_1.default.strings,
            city: validationSchema_1.default.strings,
            country: validationSchema_1.default.strings,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        const user = await User_1.User.findByIdAndUpdate(userId, {
            $set: {
                name: name,
                email: email,
                phone1,
                phone2,
                address,
                city,
                country,
            },
        }, { new: true });
        if (!user)
            return (0, responseService_1.resSender)(res, 403, "fail", "User not found");
        return (0, responseService_1.resSender)(res, 200, "success", "Setting saved", null, (0, modifyUserResponse_1.modifyUserResponse)(user));
    }
    catch (error) {
        logger_1.logger.error("Failed to edit profile: ", error.message);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Server Error");
    }
});
exports.inviteAction = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { email, token, accountId, action } = req.body;
        const { error } = joi_1.default.object({
            email: validationSchema_1.default.email,
            accountId: validationSchema_1.default.objectId,
            token: validationSchema_1.default.strings,
            action: validationSchema_1.default.strings.valid("accept", "reject"),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", "Wrong Parameter", error.details[0].message);
        const decoded = (0, tokenService_1.verifyToken)(token, process.env.ACCESS_SECRET);
        if (!decoded)
            return (0, responseService_1.resSender)(res, 400, "fail", "Invalid token");
        const user = await User_1.User.findById(accountId);
        if (!user)
            return (0, responseService_1.resSender)(res, 404, "fail", "Account not found");
        // user.usersAccess.
    }
    catch (error) {
        console.log("Error updating invite status: ", error.message);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Failed to update invite");
    }
});
