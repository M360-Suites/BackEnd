"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_microsoft_1 = require("passport-microsoft");
const passport_1 = __importDefault(require("passport"));
let serverUrl = process.env.NODE_ENV === "development"
    ? process.env.SERVER_URL
    : process.env.PROD_URL;
const microsoftStrategyOptions = {
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: `${serverUrl}/api/campaigns/microsoft/callback`,
    scope: [
        "openid",
        "profile",
        "email",
        "offline_access",
        "User.Read", // Required for profile data
        "https://graph.microsoft.com/Mail.Send", // For sending emails
    ],
    prompt: "consent",
    passReqToCallback: true,
    tenant: "common", // or "organizations" for work accounts only
};
passport_1.default.use("microsoft", new passport_microsoft_1.Strategy(microsoftStrategyOptions, async (req, accessToken, refreshToken, params, profile, done) => {
    try {
        // console.log("Raw Microsoft Profile:", profile);
        // console.log("Access Token:", accessToken);
        // console.log("Refresh Token:", refreshToken);
        // const user = req.user as any;
        if (!profile)
            throw new Error("User profile not found!");
        return done(null, {
            id: profile.id,
            email: profile.emails?.[0]?.value || profile.mail, // Fallback to params.email
            accessToken,
            refreshToken,
        });
    }
    catch (err) {
        console.error("Microsoft Strategy Error:", err);
        return done(err);
    }
}));
// passport.use('microsoft', new MicrosoftStrategy(
//   {
//     clientID: process.env.MICROSOFT_CLIENT_ID!,
//     clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
//     callbackURL: `${process.env.SERVER_URL}/auth/microsoft/callback`,
//     scope: ['openid', 'profile', 'email', 'offline_access', 'https://graph.microsoft.com/Mail.Send'],
//     tenant: 'common',
//     passReqToCallback: true,
//     customParams: {
//       prompt: 'consent'
//     }
//   },
//   async (
//     req: Request,
//     accessToken: string,
//     refreshToken: string,
//     params: any,
//     profile: any,
//     done: VerifyCallback
//   ) => {
//     try {
//       const user = req.user as any;
//       return done(null, {
//         id: user._id,
//         email: profile.emails?.[0]?.value,
//         accessToken,
//         refreshToken
//       });
//     } catch (err) {
//       return done(err as Error);
//     }
//   }
// ));
