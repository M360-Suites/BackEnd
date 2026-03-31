import { Request, Response } from "express";
import { User, IUser } from "../../Models/User";
import { generateToken, saveCookies } from "../../Services/tokenService";
import passport from "passport";
import { resSender } from "../../Services/responseService";

// Define a custom interface that extends Express Request
interface GoogleAuthRequest extends Request {
  user?: {
    user?: {
      _id: string;
      email: string;
      firstName: string;
      lastName: string;
      picture?: string;
    };
    _id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    picture?: string;
  };
}

const jwtAccess = process.env.ACCESS_SECRET as string;
const jwtRefresh = process.env.REFRESH_SECRET as string;

// Initiate Google authentication
const googleLogin = passport.authenticate("google-signin", {
  scope: ["profile", "email"],
});

// Google callback middleware to handle passport authentication
const handleGoogleCallback = passport.authenticate("google-signin", {
  failureRedirect: "/auth/login",
  session: false,
});

// Handle the callback from Google
const googleCallback = async (req: GoogleAuthRequest, res: Response) => {
  try {
    // Check if user exists
    if (!req.user) return resSender(res, 401, "fail", "User not authenticated");

    // Extract user data from req.user
    const userData = req.user.user || req.user;
    
    // Make sure we have the required fields
    if (!userData._id || !userData.email) return resSender(res, 403, "fail", "Invalid user data");

    // Successful authentication, generate JWT
    const payload = { userId: userData._id, email: userData.email };
    const accessToken = generateToken(
      payload,
      jwtAccess,
      { expiresIn: "7h" }
    );
    const refreshToken = generateToken(
      payload,
      jwtRefresh,
      { expiresIn: "7d" }
    );

    // Send the tokens to the client
    await saveCookies(res, "rfst_tkn", refreshToken);
    return resSender(res, 200, 'success', 'Sign in successful', null, { accessToken, user: userData });
  } catch (error: any) {
    console.error(error);
    return resSender(res, 500, "error", error.message || "Internal Server Error");
  }
};

export {
  googleLogin,
  handleGoogleCallback,
  googleCallback,
};
