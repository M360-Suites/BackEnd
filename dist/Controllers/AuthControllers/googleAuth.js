"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleCallback = exports.handleGoogleCallback = exports.googleLogin = void 0;
const tokenService_1 = require("../../Services/tokenService");
const passport_1 = __importDefault(require("passport"));
const responseService_1 = require("../../Services/responseService");
const jwtAccess = process.env.ACCESS_SECRET;
const jwtRefresh = process.env.REFRESH_SECRET;
// Initiate Google authentication
const googleLogin = passport_1.default.authenticate("google-signin", {
    scope: ["profile", "email"],
});
exports.googleLogin = googleLogin;
// Google callback middleware to handle passport authentication
const handleGoogleCallback = passport_1.default.authenticate("google-signin", {
    failureRedirect: "/auth/login",
    session: false,
});
exports.handleGoogleCallback = handleGoogleCallback;
// Handle the callback from Google
const googleCallback = async (req, res) => {
    try {
        // Check if user exists
        if (!req.user)
            return (0, responseService_1.resSender)(res, 401, "fail", "User not authenticated");
        // Extract user data from req.user
        const userData = req.user.user || req.user;
        // Make sure we have the required fields
        if (!userData._id || !userData.email)
            return (0, responseService_1.resSender)(res, 403, "fail", "Invalid user data");
        // Successful authentication, generate JWT
        const payload = { userId: userData._id, email: userData.email };
        const accessToken = (0, tokenService_1.generateToken)(payload, jwtAccess, { expiresIn: "7h" });
        const refreshToken = (0, tokenService_1.generateToken)(payload, jwtRefresh, { expiresIn: "7d" });
        // Send the tokens to the client
        await (0, tokenService_1.saveCookies)(res, "rfst_tkn", refreshToken);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Sign in successful', null, { accessToken, user: userData });
    }
    catch (error) {
        console.error(error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Internal Server Error");
    }
};
exports.googleCallback = googleCallback;
