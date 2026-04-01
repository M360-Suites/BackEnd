"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchInvitation = exports.acceptInvite = exports.inviteUserToAccount = exports.createOrganizationAccount = void 0;
const utils_1 = require("../../helpers/utils");
const responseService_1 = require("../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../Services/validationSchema"));
const User_1 = require("../../Models/User");
const tokenService_1 = require("../../Services/tokenService");
const accessMail_1 = require("../../Mails/accessMail");
const newMailService_1 = require("../../Services/newMailService");
const date_fns_1 = require("date-fns");
const modifyUserResponse_1 = require("../../Services/modifyUserResponse");
exports.createOrganizationAccount = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { name, url, email, avatar } = req.body;
        const userId = req.user._id;
        const { error } = joi_1.default.object({
            name: validationSchema_1.default.strings,
            url: validationSchema_1.default.strings,
            email: validationSchema_1.default.email,
            avatar: validationSchema_1.default.text,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        const org = new User_1.Organization({
            name,
            slug: url,
            email,
            avatar,
            onTrial: true,
            trialStart: new Date(Date.now()),
            trialEnd: new Date((0, date_fns_1.addDays)(Date.now(), 14)),
            createdBy: userId,
        });
        await org.save();
        await User_1.Membership.create({
            userId,
            organizationId: org._id,
            role: "owner",
            status: "active",
            invitedBy: userId,
            invitedAt: new Date(Date.now()),
            acceptedAt: new Date(Date.now()),
        });
        return (0, responseService_1.resSender)(res, 201, "success", "Organization created", null, org);
    }
    catch (error) {
        return (0, responseService_1.resSender)(res, 500, "error", error.message);
    }
});
exports.inviteUserToAccount = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const orgId = req.membership?.organizationId;
        // console.log('OrgId2:', orgId);
        const { email, role } = req.body;
        const { error } = joi_1.default.object({
            email: validationSchema_1.default.email,
            role: validationSchema_1.default.strings.valid(...Object.values(User_1.UserRoles)),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", "Wrong Parameter", error.details[0].message);
        // const org = await Organization.findById(orgId);
        if (!orgId)
            return (0, responseService_1.resSender)(res, 403, "fail", "Organization not found!");
        let tokenPayload = {
            userId: '',
            email,
            invitor: userId,
            role,
        };
        let token = (0, tokenService_1.generateToken)(tokenPayload, process.env.ACCESS_SECRET, {
            expiresIn: "7d",
        });
        let accessUrl = `${process.env.CLIENT_URL}/account/${orgId._id}/access?token=${token}`;
        let mailContent = (0, accessMail_1.accountAccessMail)({
            firstName: email,
            invitor: req.user.name,
            accountName: orgId.name,
            accessUrl,
        });
        let emailSent = await (0, newMailService_1.sendMail)(email, "Account Access Notification", mailContent, process.env.NOREPLY_EMAIL);
        await User_1.Membership.create({
            email,
            organizationId: orgId._id,
            role,
            status: "invited",
            invitedBy: userId,
            invitedAt: new Date(Date.now()),
        });
        return (0, responseService_1.resSender)(res, 200, "success", "User Invited");
    }
    catch (error) {
        console.log("Error inviting user to account: ", error.message);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Failed to invite user");
    }
});
exports.acceptInvite = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        let user = req.user;
        const userId = user._id;
        const { token, orgId } = req.body;
        const { error } = joi_1.default.object({
            orgId: validationSchema_1.default.objectId,
            token: validationSchema_1.default.strings,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", "Wrong Parameter", error.details[0].message);
        const decoded = (0, tokenService_1.verifyToken)(token, process.env.ACCESS_SECRET);
        if (!decoded)
            return (0, responseService_1.resSender)(res, 400, "fail", "Invalid token");
        if (user.email !== decoded.email) {
            return (0, responseService_1.resSender)(res, 403, "fail", "Bad Request", "We couldn't veryify your access to the organization");
        }
        const membership = await User_1.Membership.findOneAndUpdate({ email: decoded.email, organizationId: orgId }, {
            $set: { userId, status: "active", acceptedAt: new Date(Date.now()) },
        }, { new: true });
        return (0, responseService_1.resSender)(res, 200, "success", "You have been added to the organization");
    }
    catch (error) {
        console.log("Error accepting invite status: ", error.message);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Failed to accept invite");
    }
});
exports.fetchInvitation = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { orgId, token } = req.query;
        console.log('Req Query: ', req.query);
        const { error } = joi_1.default.object({
            orgId: validationSchema_1.default.strings,
            token: validationSchema_1.default.strings,
        }).validate(req.query);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", "Wrong Parameter", error.details[0].message);
        const org = await User_1.Organization.findById(orgId);
        const decoded = (0, tokenService_1.verifyToken)(token, process.env.ACCESS_SECRET);
        console.log('Decoded: ', decoded);
        let user = await User_1.User.findById(decoded.invitor);
        let inviteData = {
            organization: org,
            role: decoded.role,
            email: decoded.email,
            invitor: (0, modifyUserResponse_1.modifyUserResponse)(user)
        };
        return (0, responseService_1.resSender)(res, 200, 'success', 'Invite Fetched', null, inviteData);
    }
    catch (error) {
        console.log('Error fetching invitation: ', error.message);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Failed to fetch invitation');
    }
});
// 145.223.89.48    216.198.79.1
