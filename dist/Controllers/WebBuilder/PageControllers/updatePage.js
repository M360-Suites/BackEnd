"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePage = void 0;
const Website_1 = require("../../../Models/Website");
const responseService_1 = require("../../../Services/responseService");
const utils_1 = require("../../../helpers/utils");
/**
 * Update a page
 */
exports.updatePage = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { id } = req.params;
        const { updates } = req.body;
        const userId = req.user._id;
        // Don't allow changing the slug if it's provided
        if (updates.slug) {
            delete updates.slug;
        }
        const updatedPage = await Website_1.Page.findByIdAndUpdate(id, {
            ...updates,
            updatedBy: userId,
            updatedAt: new Date(),
        }, { new: true, runValidators: true });
        if (!updatedPage) {
            return (0, responseService_1.resSender)(res, 404, "error", "Page not found");
        }
        return (0, responseService_1.resSender)(res, 200, "success", "Page updated successfully", null, updatedPage);
    }
    catch (error) {
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Failed to update page");
    }
});
