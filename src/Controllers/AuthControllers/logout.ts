import { Response } from 'express';
import { asyncHandler } from '../../helpers/utils';
import { CustomRequest } from '../../Types/CustomRequest';
import { resSender } from '../../Services/responseService';

export const logout = asyncHandler(async (req: CustomRequest, res: Response) => {
  try {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.ENV === 'production',
      sameSite: 'strict' as const,
    };

    // Passport logout guard
    if (typeof (req as any).logout === 'function') {
      (req as any).logout();
    }

    // Clear refresh token cookie
    res.clearCookie('rfst_tkn', cookieOptions);

    return resSender(res, 200, 'success', 'Logout successful');
  } catch (error: any) {
    console.error('Failed to logout, try again: ', error);
    return resSender(res, 500, 'error', error.message || 'Server Error');
  }
});
