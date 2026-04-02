"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCampaigns = void 0;
const responseService_1 = require("../../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
const Campaign_1 = require("../../../Models/Campaign");
const utils_1 = require("../../../helpers/utils");
exports.deleteCampaigns = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { error } = joi_1.default.object({
            ids: joi_1.default.array().items(validationSchema_1.default.objectId).required(),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const { ids } = req.body;
        const orgId = req.organizationId?._id;
        if (!ids || ids.length < 1)
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Campaign IDs are required');
        const deletedCampaigns = await Campaign_1.Campaign.deleteMany({
            org: orgId,
            _id: { $in: ids },
        });
        if (deletedCampaigns.deletedCount === 0)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'No campaigns found to delete');
        return (0, responseService_1.resSender)(res, 200, 'success', 'Campaigns deleted successfully');
    }
    catch (error) {
        console.error('Error deleting campaign:', error);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Error deleting campaigns');
    }
});
