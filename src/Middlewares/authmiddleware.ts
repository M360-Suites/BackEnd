import { NextFunction, Request, Response } from 'express';
import { resSender } from '../Services/responseService';
import { verifyToken } from '../Services/tokenService';
import { IOrganization, Membership, User } from '../Models/User';
import { modifyUserResponse } from '../Services/modifyUserResponse';
import { asyncHandler } from '../helpers/utils';
import { CustomRequest } from '../Types/CustomRequest';

const jwtAccess = process.env.ACCESS_SECRET as string;

export const authMiddleware = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      // Get the auth token from request headers
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return resSender(res, 401, 'fail', 'No token');

      const decoded = verifyToken(token, jwtAccess) as any;
      const user = await User.findById(decoded.userId);
      if (!user) return resSender(res, 401, 'fail', 'Invalid token');

      // Get organization context from header or query
      const orgId = req.headers['x-org-id'] || req.query.orgId;
      // console.log('OrgId:', orgId);

      if (orgId) {
        // Multi-tenant mode: fetch membership
        const membership = await Membership.findOne({
          userId: user._id,
          organizationId: orgId,
          status: 'active',
        }).populate('organizationId');

        if (!membership) {
          return resSender(res, 403, 'fail', 'No access to this organization');
        }

        // console.log("Membership: ", membership);

        req.user = modifyUserResponse(user);
        req.organizationId = membership.organizationId as unknown as IOrganization;
        req.membership = membership;
        req.userRole = membership.role;
      } else {
        req.user = modifyUserResponse(user);
      }

      next();
    } catch (error: any) {
      console.error('Error message:', error.message);
      console.error('Error name:', error.name);

      if (error.name === 'TokenExpiredError') {
        return resSender(res, 401, 'fail', 'Token has expired, please login again');
      }

      return resSender(res, 401, 'fail', 'Invalid token or authentication failed');
    }
  },
);
