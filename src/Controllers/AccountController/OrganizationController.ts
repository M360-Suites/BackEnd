import { Request, Response } from "express";
import { asyncHandler } from "../../helpers/utils";
import { resSender } from "../../Services/responseService";
import Joi from "joi";
import validationSchema from "../../Services/validationSchema";
import { Membership, Organization, User, UserRoles } from "../../Models/User";
import { generateToken, JWTPayload, verifyToken } from "../../Services/tokenService";
import { accountAccessMail } from "../../Mails/accessMail";
import { sendMail } from "../../Services/newMailService";
import { CustomRequest } from "../../Types/CustomRequest";
import { addDays } from "date-fns";
import { modifyUserResponse } from "../../Services/modifyUserResponse";

export const createOrganizationAccount = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { name, url, email, avatar } = req.body;
      const userId = (req.user as any)._id;
      const { error } = Joi.object({
        name: validationSchema.strings,
        url: validationSchema.strings,
        email: validationSchema.email,
        avatar: validationSchema.text,
      }).validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const org = new Organization({
        name,
        slug: url,
        email,
        avatar,
        onTrial: true,
        trialStart: new Date(Date.now()),
        trialEnd: new Date(addDays(Date.now(), 14)),
        createdBy: userId,
      });
      await org.save();
      await Membership.create({
        userId,
        organizationId: org._id,
        role: "owner",
        status: "active",
        invitedBy: userId,
        invitedAt: new Date(Date.now()),
        acceptedAt: new Date(Date.now()),
      });

      return resSender(res, 201, "success", "Organization created", null, org);
    } catch (error: any) {
      return resSender(res, 500, "error", error.message);
    }
  }
);

export const inviteUserToAccount = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const userId = (req.user as any)._id;
      const orgId = req.membership?.organizationId as any;
      // console.log('OrgId2:', orgId);
      const { email, role } = req.body;

      const { error } = Joi.object({
        email: validationSchema.email,
        role: validationSchema.strings.valid(...Object.values(UserRoles)),
      }).validate(req.body);
      if (error)
        return resSender(
          res,
          400,
          "fail",
          "Wrong Parameter",
          error.details[0].message
        );

      // const org = await Organization.findById(orgId);
      if (!orgId) return resSender(res, 403, "fail", "Organization not found!");

      let tokenPayload: JWTPayload = {
        userId: '',
        email,
        invitor: userId,
        role,
      };
      let token = generateToken(tokenPayload, process.env.ACCESS_SECRET!, {
        expiresIn: "7d",
      });
      let accessUrl = `${process.env.CLIENT_URL}/account/${orgId._id}/access?token=${token}`;
      let mailContent = accountAccessMail({
        firstName: email,
        invitor: (req.user as any).name,
        accountName: orgId.name,
        accessUrl,
      });
      let emailSent = await sendMail(
        email,
        "Account Access Notification",
        mailContent,
        process.env.NOREPLY_EMAIL!
      );

      await Membership.create({
        email,
        organizationId: orgId._id,
        role,
        status: "invited",
        invitedBy: userId,
        invitedAt: new Date(Date.now()),
      });

      return resSender(res, 200, "success", "User Invited");
    } catch (error: any) {
      console.log("Error inviting user to account: ", error.message);
      return resSender(
        res,
        500,
        "error",
        error.message || "Failed to invite user"
      );
    }
  }
);

export const acceptInvite = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      let user = req.user as any;
      const userId = user._id;
      const { token, orgId } = req.body;

      const { error } = Joi.object({
        orgId: validationSchema.objectId,
        token: validationSchema.strings,
      }).validate(req.body);
      if (error)
        return resSender(
          res,
          400,
          "fail",
          "Wrong Parameter",
          error.details[0].message
        );

      const decoded = verifyToken(token, process.env.ACCESS_SECRET!) as any;
      if (!decoded) return resSender(res, 400, "fail", "Invalid token");

      if (user.email !== decoded.email) {
        return resSender(
          res,
          403,
          "fail",
          "Bad Request",
          "We couldn't veryify your access to the organization"
        );
      }

      const membership = await Membership.findOneAndUpdate(
        { email: decoded.email, organizationId: orgId },
        {
          $set: { userId, status: "active", acceptedAt: new Date(Date.now()) },
        },
        { new: true }
      );

      return resSender(
        res,
        200,
        "success",
        "You have been added to the organization"
      );
    } catch (error: any) {
      console.log("Error accepting invite status: ", error.message);
      return resSender(
        res,
        500,
        "error",
        error.message || "Failed to accept invite"
      );
    }
  }
);

export const fetchInvitation = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const { orgId, token } = req.query;
    console.log('Req Query: ', req.query);
    const { error } = Joi.object({
      orgId: validationSchema.strings,
      token: validationSchema.strings,
    }).validate(req.query);
    if (error)
      return resSender(
        res,
        400,
        "fail",
        "Wrong Parameter",
        error.details[0].message
      );
    
    const org = await Organization.findById(orgId);
    const decoded = verifyToken(token as string, process.env.ACCESS_SECRET!) as any;
    console.log('Decoded: ', decoded);
    let user = await User.findById(decoded.invitor);

    let inviteData = {
      organization: org,
      role: decoded.role,
      email: decoded.email,
      invitor: modifyUserResponse(user!)
    }

    return resSender(res, 200, 'success', 'Invite Fetched', null, inviteData);
  } catch (error: any) {
    console.log('Error fetching invitation: ', error.message);
    return resSender(res, 500, 'error', error.message || 'Failed to fetch invitation');
  }
})

// 145.223.89.48    216.198.79.1
