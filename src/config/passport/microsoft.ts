import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import passport from "passport";
import { Request } from "express";
import type { VerifyCallback } from "passport-oauth2";

let serverUrl =
  process.env.NODE_ENV === "development"
    ? process.env.SERVER_URL
    : process.env.PROD_URL;

const microsoftStrategyOptions: any = {
  clientID: process.env.MICROSOFT_CLIENT_ID!,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
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

passport.use(
  "microsoft",
  new MicrosoftStrategy(
    microsoftStrategyOptions,
    async (
      req: Request,
      accessToken: string,
      refreshToken: string,
      params: any,
      profile: any,
      done: VerifyCallback
    ) => {
      try {
        // console.log("Raw Microsoft Profile:", profile);
        // console.log("Access Token:", accessToken);
        // console.log("Refresh Token:", refreshToken);

        // const user = req.user as any;
        if (!profile) throw new Error("User profile not found!");

        return done(null, {
          id: profile.id,
          email: profile.emails?.[0]?.value || profile.mail, // Fallback to params.email
          accessToken,
          refreshToken,
        });
      } catch (err) {
        console.error("Microsoft Strategy Error:", err);
        return done(err as Error);
      }
    }
  )
);

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
