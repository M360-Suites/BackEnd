import { Request, Response } from "express";
import { asyncHandler } from "../../helpers/utils";
import useSocketIoHook from "../../hooks/useSocketIoHook";
import { resSender } from "../../Services/responseService";
import Joi from "joi";
import validationSchema from "../../Services/validationSchema";
import {
  addNotification,
  getUserNotificationById,
  getUserNotifications,
} from "../../Services/notificationService";
import { isValidObjectId, Types } from "mongoose";
import { CustomRequest } from "../../Types/CustomRequest";
const { emitToUser, emitToAuthUser, emitToUsers } = useSocketIoHook();

export const createNotification = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const userId = (req.user as any)._id;

      const { title, content, receiverId } = req.body;
      const { error } = Joi.object({
        title: validationSchema.strings,
        content: validationSchema.strings,
        receiverId: validationSchema.objectId,
      }).validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const notification = addNotification(receiverId, title, content);
      emitToUser(receiverId, "notification", notification);

      return resSender(res, 200, "success", "Success", null, notification);
    } catch (error: any) {
      console.log("Error creating notification:", error.message);
      return resSender(
        res,
        500,
        "error",
        "Failed",
        error.message || "Failed to create notification"
      );
    }
  }
);

export const fetchNotifications = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const userId = (req.user as any)._id;
      const notifications = await getUserNotifications(userId);

      return resSender(
        res,
        200,
        "success",
        "Notifications fetched",
        null,
        notifications
      );
    } catch (error: any) {
      console.log("Error fetching notifications:", error.message);
      return resSender(
        res,
        500,
        "error",
        "Failed",
        error.message || "Failed to fetch notifications"
      );
    }
  }
);

export const getNotification = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const userId = (req.user as any)._id;
      const { id } = req.params;
      const { error } = Joi.object({
        id: validationSchema.objectId,
      }).validate(req.params);
      if (error) return resSender(res, 400, "fail", error.details[0].message);
      if (!isValidObjectId(id))
        return resSender(res, 400, "fail", "Invalid id");

      const notification = await getUserNotificationById(
        id as unknown as Types.ObjectId
      );
      if (!notification)
        return resSender(res, 404, "fail", "Notification not found!");
      return resSender(
        res,
        200,
        "success",
        "Notifications fetched",
        null,
        notification
      );
    } catch (error: any) {
      console.log("Error fetching notifications:", error.message);
      return resSender(
        res,
        500,
        "error",
        "Failed",
        error.message || "Failed to fetch notifications"
      );
    }
  }
);
