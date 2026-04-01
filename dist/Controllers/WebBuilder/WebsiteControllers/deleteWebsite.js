"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWebsite = void 0;
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
const joi_1 = __importDefault(require("joi"));
const responseService_1 = require("../../../Services/responseService");
const Website_1 = require("../../../Models/Website");
const User_1 = require("../../../Models/User");
const utils_1 = require("../../../helpers/utils");
exports.deleteWebsite = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const orgId = (req.organizationId)?._id;
        // Validate the ID
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        // Find and delete the website
        const deletedWebsite = await Website_1.Website.findByIdAndDelete(id);
        if (!deletedWebsite) {
            return (0, responseService_1.resSender)(res, 404, "error", "Website not found");
        }
        // Also remove the website reference from the user
        await User_1.Organization.findByIdAndUpdate(orgId, { $pull: { websites: id } }, { new: true });
        return (0, responseService_1.resSender)(res, 200, "success", "Website deleted successfully", null, deletedWebsite);
    }
    catch (error) {
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Failed to delete website");
    }
});
