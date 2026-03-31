import { Request, Response } from "express";
import { resSender } from "../../Services/responseService";
import { logger } from "../../logger/logger";
import { forgetPassword } from "../../Mails/otpMail";
import validationSchema from "../../Services/validationSchema";
import Joi from "joi";
import { User } from "../../Models/User";
import { sendMail } from "../../Services/mailService";
import bcrypt from "bcryptjs";
import Otp from "../../Models/Otp";
import { createAndSendOtp, verifyOtp } from "../../Services/otpService";
import { verifyToken } from "../../Services/tokenService";
import { asyncHandler } from "../../helpers/utils";
import { CustomRequest } from "../../Types/CustomRequest";

const jwtAccess = process.env.ACCESS_SECRET as string;

/**
 * @param email Account email
 * @param reason Reason for code request
 */
export const sendCode = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { email, reason } = req.body;
      const { error } = Joi.object({
        email: validationSchema.email,
        reason: validationSchema.reason.disallow("trial"),
      }).validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const existingMail = await User.findOne({ email: email });
      if (!existingMail) {
        logger.info("User Email does not exist");
        return resSender(
          res,
          200,
          "success",
          "Verification Code will be sent to your mail, if it exists!"
        );
      }

      const emailSent = await createAndSendOtp(existingMail.email, reason);

      return resSender(
        res,
        200,
        "success",
        "Verification Code will be sent to your mail, if it exists!"
      );
    } catch (error: any) {
      logger.error("Failed to request for trial: ", error);
      return resSender(res, 500, "error", error.message || "Server Error");
    }
  }
);

/**
 * @param code This is the verification received from user's mail
 * @param email User's email address
 * @param reason Reason for code verification
 */
export const verifyCode = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { email, code, reason } = req.body;
      const { error } = Joi.object({
        email: validationSchema.email,
        code: validationSchema.strings,
        reason: validationSchema.reason,
      }).validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const token = await verifyOtp(code, email, reason);
      return resSender(
        res,
        200,
        "success",
        "Code verified successfully!",
        null,
        token
      );
    } catch (error: any) {
      logger.error("Failed to verify code: ", error);
      return resSender(res, 500, "error", error.message || "Server Error");
    }
  }
);

/**
 * @param newPassword This is the new Password that the user wants
 * @param token Token issued after code confirmation
 */
export const resetPassword = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { newPassword, token } = req.body;
      const { error } = Joi.object({
        newPassword: validationSchema.password,
        token: validationSchema.strings,
      }).validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      // Validate received token
      const decoded: any = await verifyToken(token, jwtAccess);
      console.log("Decoded Payload: ", decoded);

      // Hash the new Password
      const salt = await bcrypt.genSalt(10);
      const hashedPwd = await bcrypt.hash(newPassword, salt);

      let user = await User.findOneAndUpdate(
        { email: decoded?.email },
        {
          $set: {
            password: hashedPwd,
          },
        }
      );
      if (!user) return resSender(res, 403, "fail", "Account not Found!");

      return resSender(res, 200, "success", "Password updated successfully!");
    } catch (error: any) {
      logger.error("Failed to verify code: ", error);
      return resSender(res, 500, "error", error.message || "Server Error");
    }
  }
);
