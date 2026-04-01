"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const User_1 = require("../../Models/User");
const dotenv_1 = require("dotenv");
const logger_1 = require("../../logger/logger");
(0, dotenv_1.config)();
let serverUrl = process.env.NODE_ENV === "development"
    ? process.env.SERVER_URL
    : process.env.PROD_URL;
passport_1.default.use("google-signin", new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${serverUrl}/api/auth/google/callback`,
    scope: ["profile", "email"],
    passReqToCallback: true,
}, async (req, accessToken, refreshToken, params, profile, done) => {
    try {
        // Check if a user with the Google Id exists
        let user = await User_1.User.findOne({ googleId: profile.id });
        if (!user) {
            // Check if the email exists already, if there's no user with the google id
            const email = profile.emails?.[0]?.value;
            if (email) {
                user = await User_1.User.findOne({ email });
                if (user) {
                    // If user exists, update with the googleId
                    user.googleId = profile.id;
                    if (!user.emailVerified)
                        user.emailVerified = true;
                    await user.save();
                }
                else {
                    // Create a new user with Google data
                    const name = profile._json?.given_name || "Unknown";
                    const lastName = profile._json?.family_name || "None";
                    const avatar = profile.photos?.[0]?.value || "";
                    // Generate a random password for Google users
                    const randomPassword = Math.random().toString(36).slice(-8);
                    // Create a new user with required fields
                    user = new User_1.User({
                        name,
                        lastName,
                        email: email,
                        avatar,
                        googleId: profile.id,
                        emailVerified: true, // Since google verifies user
                        password: randomPassword, // This should be hashed in a real implementation
                    });
                    await user.save();
                }
            }
        }
        if (!user) {
            return done(new Error("Could not create user"), undefined);
        }
        // Pass user data to the next middleware
        const userData = {
            _id: user._id,
            email: user.email,
            name: user.name,
            picture: user.avatar,
        };
        return done(null, { user: userData });
    }
    catch (error) {
        logger_1.logger.error("Error in Google Strategy:", error);
        done(error, undefined);
    }
}));
passport_1.default.use("google-mail", new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${serverUrl}/api/campaigns/google/callback`,
    passReqToCallback: true,
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value;
        if (!email || !accessToken || !refreshToken) {
            return done(new Error("Missing credentials"), false);
        }
        // console.log("Google Profile: ", profile);
        return done(null, {
            // id: (req.user as any).id,
            email,
            accessToken,
            refreshToken,
            profile,
        });
    }
    catch (error) {
        logger_1.logger.error("Error in Google Mail Strategy:", error);
        done(error, false);
    }
}));
// Attach authorizationParams manually
passport_google_oauth20_1.Strategy.prototype.authorizationParams = function () {
    return {
        access_type: "offline",
        prompt: "consent",
    };
};
// Serialize user instance to the session
passport_1.default.serializeUser((user, done) => {
    done(null, user.user?._id || user._id);
});
// Deserialize user from the session
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await User_1.User.findById(id);
        done(null, user);
    }
    catch (error) {
        done(error, null);
    }
});
exports.default = passport_1.default;
