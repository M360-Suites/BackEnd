"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWebsite = void 0;
const Website_1 = require("../../../Models/Website");
const responseService_1 = require("../../../Services/responseService");
const utils_1 = require("../../../helpers/utils");
exports.updateWebsite = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { id } = req.params;
        const { updates } = req.body;
        const userId = req.user._id;
        // Don't allow changing the slug if it's provided
        if (updates.slug) {
            delete updates.slug;
        }
        const updatedWebsite = await Website_1.Website.findByIdAndUpdate(id, {
            ...updates,
            updatedBy: userId,
            updatedAt: new Date(),
        }, { new: true, runValidators: true });
        if (!updatedWebsite) {
            return (0, responseService_1.resSender)(res, 404, 'error', 'Website not found');
        }
        return (0, responseService_1.resSender)(res, 200, 'success', 'Website updated successfully', null, updatedWebsite);
    }
    catch (error) {
        console.error('Error updating website: ', error);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Failed to update website');
    }
});
