"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signIn = void 0;
const responseService_1 = require("../../Services/responseService");
const User_1 = require("../../Models/User");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const tokenService_1 = require("../../Services/tokenService");
const modifyUserResponse_1 = require("../../Services/modifyUserResponse");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../Services/validationSchema"));
const jwtAccess = process.env.ACCESS_SECRET;
const jwtRefresh = process.env.REFRESH_SECRET;
const signIn = async (req, res) => {
    try {
        // logger.info("Sign In Controller");
        const { email, password } = req.body;
        const { error } = joi_1.default.object({
            email: validationSchema_1.default.email,
            password: validationSchema_1.default.password,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        if (!email || !password) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Email and password are required');
        }
        // Check if the user exists
        const user = await User_1.User.findOne({ email: email });
        if (!user) {
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Invalid Credentials');
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Invalid Credentials');
        }
        // Generate a JWT token
        let payload = {
            userId: user._id,
            email: user.email,
        };
        const [accessToken, refreshToken] = await Promise.all([
            (0, tokenService_1.generateToken)(payload, jwtAccess, {
                expiresIn: '30d',
            }),
            (0, tokenService_1.generateToken)(payload, jwtRefresh, {
                expiresIn: '30d',
            }),
        ]);
        let org = (await User_1.Membership.findOne({ userId: user._id, status: 'active' }).populate('organizationId'))?.organizationId;
        await (0, tokenService_1.saveCookies)(res, 'rfst_tkn', refreshToken);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Sign In Successful', null, {
            user: (0, modifyUserResponse_1.modifyUserResponse)(user),
            accessToken,
            defaultOrg: org,
        });
    }
    catch (error) {
        console.error('Error in signIn controller:', error);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Server Error');
    }
};
exports.signIn = signIn;
