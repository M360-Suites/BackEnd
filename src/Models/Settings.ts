import { model, Schema, Types } from "mongoose";
import { Domains, NotificationType } from "../Types/settings";
import { ComPlatform, SocialPlatform } from "../Types/types";
import { Currency } from "../Types/payment";
import { AdsPlatform } from "../Types/ads";

const settingSchema = new Schema({
  userId: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
  },
  general: {
    language: String,
    timezone: String,
    currency: {
      type: String,
      enum: Object.values(Currency),
    },
    dateFormat: String,
  },
  notifications: {
    email: Boolean,
    sms: Boolean,
    push: Boolean,
    notificationType: [
      {
        type: String,
        enum: Object.values(NotificationType),
      },
    ],
  },
  domain: {
    domain: String,
    favIcon: String,
    logo: String,
  },
  email: {
    connectedEmail: String,
    adsNotification: Boolean,
    socialsNotification: Boolean,
  },
  security: {
    enable2FA: Boolean,
    enableDownloadOverData: Boolean,
  },
});

const Settings = model("Setting", settingSchema);

export { Settings };
