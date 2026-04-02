"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeContacts = void 0;
const responseService_1 = require("../../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
const Campaign_1 = require("../../../Models/Campaign");
const utils_1 = require("../../../helpers/utils");
exports.removeContacts = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { error } = joi_1.default.object({
            ids: joi_1.default.array().items(validationSchema_1.default.objectId).required(),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const { ids } = req.body;
        if (!ids || ids.length < 1)
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Emails addresses is required');
        await Campaign_1.Subscriber.deleteMany({
            subscribee: req.organizationId?._id,
            _id: { $in: ids },
        });
        return (0, responseService_1.resSender)(res, 200, 'success', 'Contacts removed successfully');
    }
    catch (error) {
        console.error(`Error removing contacts: ${error}`);
        return (0, responseService_1.resSender)(res, 500, 'error', 'Internal server error');
    }
});
