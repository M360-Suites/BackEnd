import { Document, model, Schema, Types } from "mongoose";

export interface INotification extends Document {
  userId: Types.ObjectId;
  title: string;
  content: string;
  link?: string;
}

const notificationSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    link: {
      type: String,
    },
  },
  { timestamps: true }
);

export default model<INotification>("Notification", notificationSchema);
