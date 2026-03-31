import { Request, Response } from "express";
import Joi from "joi";
import comOauth from "./oauth";
import { resSender } from "../../../Services/responseService";
import { ComPlatform } from "../../../Types/types";
import { asyncHandler } from "../../../helpers/utils";
import { CustomRequest } from "../../../Types/CustomRequest";

export const initComAuth = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const { error } = Joi.object({
        platform: Joi.string().required().valid(
          "facebook",
          "instagram",
          "linkedin"
          //   "pinterest"
        ),
      }).validate(req.params);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const { platform } = req.params;
      const orgId = req.organizationId?._id;

      if (!Object.values(ComPlatform).includes(platform as ComPlatform)) {
        return resSender(res, 400, "fail", "Invalid platform");
      }

      const { url: authUrl, csrfState } = await comOauth.generateAuthUrl(
        platform as ComPlatform,
        orgId as string
      );
      console.log("Com AUth Url: ", authUrl);
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
      console.log("Error in Com auth: ", error);
      return resSender(
        res,
        500,
        "error",
        error.message || "Error occured while connecting to platform."
      );
    }
  }
);

export const handleComCallback = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      console.log("Com Callback received");
      const { code, state } = req.query;

      if (!code || !state)
        return resSender(res, 400, "fail", "Missing code or state parameter");

      console.log("Ads Code is: ", code);
      const con = await comOauth.handleCallback(
        code as string,
        state as string
      );
      console.log("COn got: ", con);

      return resSender(res, 200, "success", "Connect Successful");
    } catch (error: any) {
      console.log("Error in Ads auth: ", error);
      return resSender(
        res,
        500,
        "error",
        error.message || "Error occured while connecting to platform."
      );
    }
  }
);

// export const handleComCallback = asyncHandler(
//   async (req: CustomRequest, res: Response) => {
//     try {
//       console.log("Com Callback received");
//       const { oauth_verifier, oauth_token, code, state } = req.query;

//       let connection;
//       let platform: ComPlatform;

//       // Determine the flow based on query parameters
//       let twitter = Boolean(
//         oauth_verifier &&
//           oauth_verifier !== "null" &&
//           oauth_token &&
//           oauth_token !== "null"
//       );

//       console.log("Twitter?: ", twitter);
//       if (twitter) {
//         // Twitter OAuth 1.0a flow
//         const retrievedState = comOauth.getStateFromToken(
//           oauth_token as string
//         );
//         if (!retrievedState) {
//           return resSender(
//             res,
//             400,
//             "fail",
//             "Invalid or missing state for oauth_token"
//           );
//         }
//         platform = comOauth.parseState(retrievedState).platform;
//         // if (platform !== ComPlatform.TWITTER) {
//         //   return resSender(
//         //     res,
//         //     400,
//         //     "fail",
//         //     "Unexpected platform for oauth_verifier flow"
//         //   );
//         // }
//         console.log("OAuth Verifier is: ", oauth_verifier);
//         connection = await comOauth.handleCallback(
//           oauth_verifier as string,
//           retrievedState
//         );
//       } else if (code && state) {
//         // OAuth 2.0 flow for other platforms
//         platform = comOauth.parseState(state as string).platform;
//         console.log("Code is: ", code);
//         connection = await comOauth.handleCallback(
//           code as string,
//           state as string
//         );
//       } else {
//         return resSender(
//           res,
//           400,
//           "fail",
//           "Missing required parameters (oauth_verifier/oauth_token or code/state)"
//         );
//       }

//       return resSender(res, 200, "success", "Connect Successful");
//     } catch (error: any) {
//       console.log("Error in Com auth: ", error);
//       return resSender(
//         res,
//         500,
//         "error",
//         error.message || "Error occured while connecting to platform."
//       );
//     }
//   }
// );
