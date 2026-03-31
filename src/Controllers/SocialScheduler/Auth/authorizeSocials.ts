import { Request, Response } from "express";
import { resSender } from "../../../Services/responseService";
import Joi from "joi";
import { SocialPlatform } from "../../../Types/types";
import OAuthService from "./oauth-Service";
import { asyncHandler } from "../../../helpers/utils";
import { CustomRequest } from "../../../Types/CustomRequest";

export const initiateAuth = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { error } = Joi.object({
        platform: Joi.string()
          .required()
          .valid(
            "facebook",
            "instagram",
            "twitter",
            "youtube",
            "linkedin",
            "tiktok",
            "pinterest"
          ),
      }).validate(req.params);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const { platform } = req.params;
      const userId = (req.user as any)._id;
      const orgId = req.organizationId?._id;

      if (!Object.values(SocialPlatform).includes(platform as SocialPlatform)) {
        return resSender(res, 400, "fail", "Invalid platform");
      }

      const { url: authUrl, csrfState } = OAuthService.generateAuthUrl(
        platform as SocialPlatform,
        orgId as string
      );
      console.log("AUth Url: ", authUrl);
      // res.json({ authUrl });
      res.cookie("csrfState", csrfState, { maxAge: 60000 });

      // return res.redirect(authUrl);

      return resSender(
        res,
        200,
        "success",
        "Connect successful!",
        null,
        authUrl
      );
    } catch (error: any) {
      console.log("Error in auth: ", error);
      return resSender(
        res,
        500,
        "error",
        error.message || "Error occured while connecting to platform."
      );
    }
  }
);

export const handleCallback = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      console.log("Callback received");
      const { code, state } = req.query;

      if (!code || !state)
        return resSender(res, 400, "fail", "Missing code or state parameter");

      console.log("Code is: ", code);

      const connection = await OAuthService.handleCallback(
        code as string,
        state as string
      );

      return resSender(res, 200, "success", "Connect successful!");
    } catch (error: any) {
      console.log("Error in auth: ", error);
      return resSender(
        res,
        500,
        "error",
        error.message || "Error occured while connecting to platform."
      );
    }
  }
);
