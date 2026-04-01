"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Settings = void 0;
const mongoose_1 = require("mongoose");
const settings_1 = require("../Types/settings");
const payment_1 = require("../Types/payment");
const settingSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Types.ObjectId,
        ref: "User",
        required: true,
    },
    general: {
        language: String,
        timezone: String,
        currency: {
            type: String,
            enum: Object.values(payment_1.Currency),
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
                enum: Object.values(settings_1.NotificationType),
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
const Settings = (0, mongoose_1.model)("Setting", settingSchema);
exports.Settings = Settings;
