"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieveSetting = exports.fetchAllSettings = void 0;
const utils_1 = require("../../helpers/utils");
const responseService_1 = require("../../Services/responseService");
const Settings_1 = require("../../Models/Settings");
exports.fetchAllSettings = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const setting = await Settings_1.Settings.findOne({ userId });
        console.log(`Settings for user ${userId} : ${setting}`);
        return (0, responseService_1.resSender)(res, 200, "success", "Successful", null, setting);
    }
    catch (error) {
        console.log("Error fetching settings: ", error.message);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Settings fetch failed");
    }
});
const retrieveSetting = async (userId) => {
    try {
        const setting = await Settings_1.Settings.findOne({ userId });
        return setting;
    }
    catch (error) {
        console.log('Error');
        throw error;
    }
};
exports.retrieveSetting = retrieveSetting;
