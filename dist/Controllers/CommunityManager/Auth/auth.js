"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleComCallback = exports.initComAuth = void 0;
const joi_1 = __importDefault(require("joi"));
const oauth_1 = __importDefault(require("./oauth"));
const responseService_1 = require("../../../Services/responseService");
const types_1 = require("../../../Types/types");
const utils_1 = require("../../../helpers/utils");
exports.initComAuth = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { error } = joi_1.default.object({
            platform: joi_1.default.string().required().valid("facebook", "instagram", "linkedin"
            //   "pinterest"
            ),
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        const { platform } = req.params;
        const orgId = req.organizationId?._id;
        if (!Object.values(types_1.ComPlatform).includes(platform)) {
            return (0, responseService_1.resSender)(res, 400, "fail", "Invalid platform");
        }
        const { url: authUrl, csrfState } = await oauth_1.default.generateAuthUrl(platform, orgId);
        console.log("Com AUth Url: ", authUrl);
        // res.json({ authUrl });
        res.cookie("csrfState", csrfState, { maxAge: 60000 });
        // return res.redirect(authUrl);
        return (0, responseService_1.resSender)(res, 200, "success", "Connect successful!", null, authUrl);
    }
    catch (error) {
        console.log("Error in Com auth: ", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occured while connecting to platform.");
    }
});
exports.handleComCallback = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        console.log("Com Callback received");
        const { code, state } = req.query;
        if (!code || !state)
            return (0, responseService_1.resSender)(res, 400, "fail", "Missing code or state parameter");
        console.log("Ads Code is: ", code);
        const con = await oauth_1.default.handleCallback(code, state);
        console.log("COn got: ", con);
        return (0, responseService_1.resSender)(res, 200, "success", "Connect Successful");
    }
    catch (error) {
        console.log("Error in Ads auth: ", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occured while connecting to platform.");
    }
});
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
