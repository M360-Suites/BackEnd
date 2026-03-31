import { Response } from "express";
import { logger } from "../../logger/logger";
import { resSender } from "../../Services/responseService";
import { asyncHandler } from "../../helpers/utils";
import Joi from "joi";
import validationSchema from "../../Services/validationSchema";
import { User, UserRoles } from "../../Models/User";
import { modifyUserResponse } from "../../Services/modifyUserResponse";
// import { sendMail } from "../../Services/newMailService";
// import { accountAccessMail } from "../../Mails/accessMail";
import { verifyToken } from "../../Services/tokenService";
// import { resetPassword } from "../AuthControllers/forgetPassword";
import { CustomRequest } from "../../Types/CustomRequest";

export const getAuthAccount = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;
      return resSender(
        res,
        204,
        "success",
        "Fetched!",
        "User account fetched",
        user
      );
    } catch (error: any) {
      logger.error("Failed to verify code: ", error);
      return resSender(res, 500, "error", error.message || "Server Error");
    }
  }
);

export const getAccountDetails = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      console.log("Req User: ", req.user);
      //   const userId = req.user._id;
    } catch (error: any) {
      logger.error("Failed to verify code: ", error);
      return resSender(res, 500, "error", error.message || "Server Error");
    }
  }
);

export const editProfile = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const userId = (req.user as any)._id;

      const { name, email, phone1, phone2, address, city, country } = req.body;
      const { error } = Joi.object({
        name: validationSchema.strings,
        email: validationSchema.email,
        phone1: validationSchema.phoneNumber,
        phone2: validationSchema.phoneNumber.optional(),
        address: validationSchema.strings,
        city: validationSchema.strings,
        country: validationSchema.strings,
      }).validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            name: name,
            email: email,
            phone1,
            phone2,
            address,
            city,
            country,
          },
        },
        { new: true }
      );
      if (!user) return resSender(res, 403, "fail", "User not found");

      return resSender(
        res,
        200,
        "success",
        "Setting saved",
        null,
        modifyUserResponse(user)
      );
    } catch (error: any) {
      logger.error("Failed to edit profile: ", error.message);
      return resSender(res, 500, "error", error.message || "Server Error");
    }
  }
);

export const inviteAction = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { email, token, accountId, action } = req.body;
      const { error } = Joi.object({
        email: validationSchema.email,
        accountId: validationSchema.objectId,
        token: validationSchema.strings,
        action: validationSchema.strings.valid("accept", "reject"),
      }).validate(req.body);
      if (error)
        return resSender(
          res,
          400,
          "fail",
          "Wrong Parameter",
          error.details[0].message
        );

      const decoded = verifyToken(token, process.env.ACCESS_SECRET!);
      if (!decoded) return resSender(res, 400, "fail", "Invalid token");

      const user = await User.findById(accountId);
      if (!user) return resSender(res, 404, "fail", "Account not found");

      // user.usersAccess.
    } catch (error: any) {
      console.log("Error updating invite status: ", error.message);
      return resSender(
        res,
        500,
        "error",
        error.message || "Failed to update invite"
      );
    }
  }
);
