import { Response } from 'express';
import { resSender } from '../../Services/responseService';
import { verifyToken, generateToken, saveCookies } from '../../Services/tokenService';
import { User } from '../../Models/User';
import { asyncHandler } from '../../helpers/utils';
import { CustomRequest } from '../../Types/CustomRequest';

const jwtAccess = process.env.ACCESS_SECRET as string;
const jwtRefresh = process.env.REFRESH_SECRET as string;

/**
 * Refresh access token using refresh token
 * Refresh token can come from cookies or request body
 */
export const refreshAccessToken = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    // Get refresh token from cookies or request body
    const refreshToken = req.cookies?.rfst_tkn || req.body?.refreshToken;

    if (!refreshToken) {
      return resSender(res, 401, 'fail', 'Refresh token is required');
    }

    // Verify the refresh token
    const decoded: any = verifyToken(refreshToken, jwtRefresh);
    if (!decoded || !decoded.userId) {
      return resSender(res, 401, 'fail', 'Invalid refresh token');
    }

    // Verify user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return resSender(res, 401, 'fail', 'User not found');
    }

    // Generate new access token
    const payload = {
      userId: user._id as string,
      email: user.email,
    };

    const newAccessToken = generateToken(payload, jwtAccess, {
      expiresIn: '10m',
    });

    // Generate new refresh token (rotating refresh tokens)
    // This improves security by limiting token lifetime
    const newRefreshToken = generateToken(payload, jwtRefresh, {
      expiresIn: '7d',
    });

    // Save new refresh token to cookies
    await saveCookies(res, 'rfst_tkn', newRefreshToken, 30 * 24 * 60 * 60 * 1000); // 30 days in milliseconds

    return resSender(res, 200, 'success', 'Token refreshed successfully', null, {
      accessToken: newAccessToken,
    //   refreshToken: newRefreshToken,
    });
  } catch (error: any) {
    console.error('Error refreshing token:', error);

    if (error.name === 'TokenExpiredError') {
      return resSender(res, 401, 'fail', 'Refresh token has expired, please login again');
    }

    if (error.name === 'JsonWebTokenError') {
      return resSender(res, 401, 'fail', 'Invalid refresh token');
    }

    return resSender(res, 500, 'error', error.message || 'Failed to refresh token');
  }
});
