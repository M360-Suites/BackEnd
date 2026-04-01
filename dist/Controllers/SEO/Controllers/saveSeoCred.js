"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveSEOCred = void 0;
const utils_1 = require("../../../helpers/utils");
const responseService_1 = require("../../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
const SEOModels_1 = require("../../../Models/SEOModels");
const encryption_1 = require("../../../Services/encryption");
exports.saveSEOCred = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const { gaPropertyId, gaApiSecret, gaMeasurementId, clarityApiKey, clarityProjectId, url, } = req.body;
        const { error } = joi_1.default.object({
            gaPropertyId: validationSchema_1.default.strings,
            gaApiSecret: validationSchema_1.default.strings,
            gaMeasurementId: validationSchema_1.default.strings,
            clarityProjectId: validationSchema_1.default.strings,
            clarityApiKey: validationSchema_1.default.strings,
            url: validationSchema_1.default.url,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        const seoCred = new SEOModels_1.SeoCredModel({
            userId,
            microsoftClarity: {
                projectId: clarityProjectId,
                apiKey: (0, encryption_1.encrypt)(clarityApiKey),
            },
            googleAnalytics: {
                propertyId: gaPropertyId,
                apiSecret: (0, encryption_1.encrypt)(gaApiSecret),
                measurementId: gaMeasurementId,
            },
            url,
        });
        await seoCred.save();
        return (0, responseService_1.resSender)(res, 200, "success", "Data saved successfully");
    }
    catch (error) {
        console.log("Error saving credentials: ", error.message);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error saving...");
    }
});
