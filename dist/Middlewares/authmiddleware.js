"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const responseService_1 = require("../Services/responseService");
const tokenService_1 = require("../Services/tokenService");
const User_1 = require("../Models/User");
const modifyUserResponse_1 = require("../Services/modifyUserResponse");
const utils_1 = require("../helpers/utils");
const jwtAccess = process.env.ACCESS_SECRET;
exports.authMiddleware = (0, utils_1.asyncHandler)(async (req, res, next) => {
    try {
        // Get the auth token from request headers
        const token = req.headers.authorization?.split(' ')[1];
        if (!token)
            return (0, responseService_1.resSender)(res, 401, 'fail', 'No token');
        const decoded = (0, tokenService_1.verifyToken)(token, jwtAccess);
        const user = await User_1.User.findById(decoded.userId);
        if (!user)
            return (0, responseService_1.resSender)(res, 401, 'fail', 'Invalid token');
        // Get organization context from header or query
        const orgId = req.headers['x-org-id'] || req.query.orgId;
        // console.log('OrgId:', orgId);
        if (orgId) {
            // Multi-tenant mode: fetch membership
            const membership = await User_1.Membership.findOne({
                userId: user._id,
                organizationId: orgId,
                status: 'active',
            }).populate('organizationId');
            if (!membership) {
                return (0, responseService_1.resSender)(res, 403, 'fail', 'No access to this organization');
            }
            // console.log("Membership: ", membership);
            req.user = (0, modifyUserResponse_1.modifyUserResponse)(user);
            req.organizationId = membership.organizationId;
            req.membership = membership;
            req.userRole = membership.role;
        }
        else {
            req.user = (0, modifyUserResponse_1.modifyUserResponse)(user);
        }
        next();
    }
    catch (error) {
        console.error('Error message:', error.message);
        console.error('Error name:', error.name);
        if (error.name === 'TokenExpiredError') {
            return (0, responseService_1.resSender)(res, 401, 'fail', 'Token has expired, please login again');
        }
        return (0, responseService_1.resSender)(res, 401, 'fail', 'Invalid token or authentication failed');
    }
});
