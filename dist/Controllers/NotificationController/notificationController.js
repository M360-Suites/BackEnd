"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotification = exports.fetchNotifications = exports.createNotification = void 0;
const utils_1 = require("../../helpers/utils");
const useSocketIoHook_1 = __importDefault(require("../../hooks/useSocketIoHook"));
const responseService_1 = require("../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../Services/validationSchema"));
const notificationService_1 = require("../../Services/notificationService");
const mongoose_1 = require("mongoose");
const { emitToUser, emitToAuthUser, emitToUsers } = (0, useSocketIoHook_1.default)();
exports.createNotification = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const { title, content, receiverId } = req.body;
        const { error } = joi_1.default.object({
            title: validationSchema_1.default.strings,
            content: validationSchema_1.default.strings,
            receiverId: validationSchema_1.default.objectId,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        const notification = (0, notificationService_1.addNotification)(receiverId, title, content);
        emitToUser(receiverId, "notification", notification);
        return (0, responseService_1.resSender)(res, 200, "success", "Success", null, notification);
    }
    catch (error) {
        console.log("Error creating notification:", error.message);
        return (0, responseService_1.resSender)(res, 500, "error", "Failed", error.message || "Failed to create notification");
    }
});
exports.fetchNotifications = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const notifications = await (0, notificationService_1.getUserNotifications)(userId);
        return (0, responseService_1.resSender)(res, 200, "success", "Notifications fetched", null, notifications);
    }
    catch (error) {
        console.log("Error fetching notifications:", error.message);
        return (0, responseService_1.resSender)(res, 500, "error", "Failed", error.message || "Failed to fetch notifications");
    }
});
exports.getNotification = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        if (!(0, mongoose_1.isValidObjectId)(id))
            return (0, responseService_1.resSender)(res, 400, "fail", "Invalid id");
        const notification = await (0, notificationService_1.getUserNotificationById)(id);
        if (!notification)
            return (0, responseService_1.resSender)(res, 404, "fail", "Notification not found!");
        return (0, responseService_1.resSender)(res, 200, "success", "Notifications fetched", null, notification);
    }
    catch (error) {
        console.log("Error fetching notifications:", error.message);
        return (0, responseService_1.resSender)(res, 500, "error", "Failed", error.message || "Failed to fetch notifications");
    }
});
