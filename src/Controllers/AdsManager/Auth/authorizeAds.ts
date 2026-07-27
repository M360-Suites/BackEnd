import { Request, Response } from "express";
import { resSender } from "../../../Services/responseService";
import Joi from "joi";
import { AdsPlatform } from "../../../Types/ads";
import adsOauth from "./ads-oauth";
import { asyncHandler } from "../../../helpers/utils";
import { CustomRequest } from "../../../Types/CustomRequest";

export const initAdsAuth = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { error } = Joi.object({
        platform: Joi.string().required().valid(
          "meta",
          "google",
          "twitter",
          // "snapchat",
          "linkedin",
          "tiktok",
          //   "pinterest"
        ),
      }).validate(req.params);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const { platform } = req.params;
      const orgId = req.organizationId?._id;
      req.headers["x-org-id"] || req.query.orgId;

      console.log("Got platform: ", platform);

      if (!Object.values(AdsPlatform).includes(platform as AdsPlatform)) {
        return resSender(res, 400, "fail", "Invalid platform");
      }

      const { url: authUrl, csrfState } = await adsOauth.generateAuthUrl(
        platform as AdsPlatform,
        orgId as string,
      );
      console.log("Ads AUth Url: ", authUrl);
      // res.json({ authUrl });
      res.cookie("csrfState", csrfState, { maxAge: 60000 });

      // return res.redirect(authUrl);

      return resSender(
        res,
        200,
        "success",
        "Connect successful!",
        null,
        authUrl,
      );
    } catch (error: any) {
      console.log("Error in Ads auth: ", error);
      return resSender(
        res,
        500,
        "error",
        error.message || "Error occured while connecting to platform.",
      );
    }
  },
);

// export const handleAdsCallback = asyncHandler(async (req: CustomRequest, res: Response) => {
//   try {
//     console.log("Ads Callback received");
//     const { code, state } = req.query;

//     if (!code || !state)
//       return resSender(res, 400, "fail", "Missing code or state parameter");

//     console.log("Ads Code is: ", code);
//     const con = await adsOauth.handleCallback(code as string, state as string);
//     console.log('COn got: ', con);

//     return resSender(res, 200, 'success', 'Connect Successful');
//   } catch (error: any) {
//     console.log("Error in Ads auth: ", error);
//     return resSender(
//       res,
//       500,
//       "error",
//       error.message || "Error occured while connecting to platform."
//     );
//   }
// })

export const handleAdsCallback = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      console.log("Ads Callback received");
      const { oauth_verifier, oauth_token, code, state } = req.query;

      let connection;
      let platform: AdsPlatform;

      // Determine the flow based on query parameters
      const isTwitterFlow =
        oauth_verifier &&
        oauth_verifier !== "null" &&
        oauth_token &&
        oauth_token !== "null";
      console.log("Twitter flow detected?: ", isTwitterFlow);

      if (isTwitterFlow) {
        // Twitter OAuth 1.0a flow
        const retrievedState = adsOauth.getStateFromToken(
          oauth_token as string,
        );
        if (!retrievedState) {
          return resSender(
            res,
            400,
            "fail",
            "Missing state",
            "Invalid or missing state for oauth_token",
          );
        }
        platform = adsOauth.parseState(retrievedState).platform;
        console.log(
          "Handling Twitter OAuth 1.0a with oauth_verifier:",
          oauth_verifier,
        );
        connection = await adsOauth.handleCallback(
          oauth_verifier as string,
          retrievedState,
          oauth_token as string,
          oauth_verifier as string,
        );
      } else if (code && state) {
        // OAuth 2.0 flow for other platforms
        platform = adsOauth.parseState(state as string).platform;
        console.log("Handling OAuth 2.0 with code:", code);
        connection = await adsOauth.handleCallback(
          code as string,
          state as string,
        );
      } else {
        return resSender(
          res,
          400,
          "fail",
          "Parameters missing",
          "Missing required parameters (oauth_verifier/oauth_token or code/state)",
        );
      }

      return resSender(
        res,
        200,
        "success",
        "Connect Successful",
        null,
        connection,
      );
    } catch (error: any) {
      console.log("Error in Ads auth:", error);
      return resSender(
        res,
        500,
        "error",
        error.message || "Error occurred while connecting to platform.",
      );
    }
  },
);
