"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserNotificationById = exports.getUserNotifications = exports.addNotification = void 0;
const Notification_1 = __importDefault(require("../Models/Notification"));
const addNotification = async (userId, title, content, link) => {
    try {
        let notification = new Notification_1.default({
            userId,
            title,
            content,
            link,
        });
        await notification.save();
        notification = await notification.populate("userId", "_id name email avatar");
        return notification;
    }
    catch (error) {
        console.log('Error');
        throw error;
    }
};
exports.addNotification = addNotification;
const getUserNotifications = async (userId) => {
    try {
        let notifications = await Notification_1.default.find({ userId }).sort({
            createdAt: -1,
        });
        return notifications;
    }
    catch (error) {
        console.log('Error');
        throw error;
    }
};
exports.getUserNotifications = getUserNotifications;
const getUserNotificationById = async (notificationId) => {
    try {
        let notification = await Notification_1.default.findById(notificationId);
        return notification;
    }
    catch (error) {
        console.log('Error');
        throw error;
    }
};
exports.getUserNotificationById = getUserNotificationById;
