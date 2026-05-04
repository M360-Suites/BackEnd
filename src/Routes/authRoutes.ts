import { Router } from 'express';
import { signIn } from '../Controllers/AuthControllers/signIn';
import { signup, startTrial } from '../Controllers/AuthControllers/signup';
import {
  googleCallback,
  googleLogin,
  handleGoogleCallback,
} from '../Controllers/AuthControllers/googleAuth';
import { resetPassword, sendCode, verifyCode } from '../Controllers/AuthControllers/forgetPassword';
import { detectProvider } from '../Controllers/EmailAutomation/Auth/authorizewithCred';
import { handleCallback } from '../Controllers/SocialScheduler/Auth/authorizeSocials';
// import { inviteUserToAccount } from "../Controllers/AccountController/GetAccount";
import { authMiddleware } from '../Middlewares/authmiddleware';
import { CustomRequestHandler } from '../Types/CustomRequest';
import { logout } from '../Controllers/AuthControllers/logout';
import { refreshAccessToken } from '../Controllers/AuthControllers/refreshToken';

const route = Router();

// Auth routes
route.post('/auth/trial', startTrial as CustomRequestHandler);
route.post('/auth/signup', signup as CustomRequestHandler);
route.post('/auth/signin', signIn as CustomRequestHandler);
route.get('/auth/google', googleLogin as CustomRequestHandler);
route.get('/auth/google/callback', handleGoogleCallback, googleCallback as CustomRequestHandler);

route.post('/auth/verify-code', verifyCode as CustomRequestHandler);
route.post('/auth/sendCode', sendCode as CustomRequestHandler);
route.post('/auth/reset-password', resetPassword as CustomRequestHandler);
route.post('/auth/provider', detectProvider as CustomRequestHandler);
route.post('/auth/refresh', refreshAccessToken as CustomRequestHandler);
route.delete(
  '/auth/logout',
  // authMiddleware as CustomRequestHandler,
  logout as CustomRequestHandler,
);

export default route;
