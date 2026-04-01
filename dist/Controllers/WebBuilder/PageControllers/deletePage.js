"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePage = void 0;
const responseService_1 = require("../../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
const Website_1 = require("../../../Models/Website");
const utils_1 = require("../../../helpers/utils");
/**
 * Delete a page
 */
exports.deletePage = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        const deletedPage = await Website_1.Page.findByIdAndDelete(id);
        if (!deletedPage) {
            return (0, responseService_1.resSender)(res, 404, "error", "Page not found");
        }
        // Optionally, you can also delete associated media if needed
        // await Media.deleteMany({ _id: { $in: deletedPage.mediaIds } });
        return (0, responseService_1.resSender)(res, 200, "success", "Page deleted successfully");
    }
    catch (error) {
        console.error("Error deleting page:", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Server error");
    }
});
