import { Types } from "mongoose";
import Notification, { INotification } from "../Models/Notification";
import { User } from "../Models/User";

export const addNotification = async (
  userId: Types.ObjectId,
  title: string,
  content: string,
  link?: string
): Promise<INotification> => {
  try {
    let notification = new Notification({
      userId,
      title,
      content,
      link,
    });
    await notification.save();

    notification = await notification.populate(
      "userId",
      "_id name email avatar"
    );

    return notification;
  } catch (error) {
    throw error;
  }
};

export const getUserNotifications = async (userId: Types.ObjectId) => {
  try {
    let notifications = await Notification.find({ userId }).sort({
      createdAt: -1,
    });
    return notifications;
  } catch (error) {
    throw error;
  }
};

export const getUserNotificationById = async (
  notificationId: Types.ObjectId
) => {
  try {
    let notification = await Notification.findById(notificationId);
    return notification;
  } catch (error) {
    throw error;
  }
};
