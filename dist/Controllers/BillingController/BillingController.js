"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingController = exports.BillingController = void 0;
const utils_1 = require("../../helpers/utils");
const BillingService_1 = require("../../Services/BillingService");
const responseService_1 = require("../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
class BillingController {
    constructor() {
        this.captureCard = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                const organizationId = req.organizationId?._id;
                console.log('Org Id: ', organizationId);
                const { features } = req.body;
                const { error } = joi_1.default.object({
                    features: joi_1.default.array()
                        .items(joi_1.default.string().valid("creative_generator", "email_automation", "social_scheduler", "community_manager", "ads_manager", "seo_toolkit"))
                        .unique()
                        .min(1)
                        .required(),
                }).validate(req.body);
                if (error)
                    return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
                const result = await BillingService_1.billingService.initializeCardCapture(organizationId, features);
                return (0, responseService_1.resSender)(res, 200, "success", "Successful", null, result);
            }
            catch (error) {
                console.log('Error occured: ', error);
                return (0, responseService_1.resSender)(res, 500, "error", error.message);
            }
        });
        this.completeCapture = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                const { reference } = req.body;
                const organizationId = req.organizationId?._id;
                await BillingService_1.billingService.completeCardCapture(organizationId, reference);
                return (0, responseService_1.resSender)(res, 200, "success", "Successful", null);
            }
            catch (error) {
                return (0, responseService_1.resSender)(res, 500, "error", error.message);
            }
        });
        this.billingStatus = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                const { organizationId } = req.params;
                const status = await BillingService_1.billingService.checkTrialStatus(organizationId);
                return (0, responseService_1.resSender)(res, 200, "success", "Successful", null, status);
            }
            catch (error) {
                return (0, responseService_1.resSender)(res, 500, "error", error.message);
            }
        });
        this.subscribe = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                const organizationId = req.organizationId?._id;
                const { features } = req.body;
                const { error } = joi_1.default.object({
                    features: joi_1.default.array()
                        .items(joi_1.default.string().valid("creative_generator", "email_automation", "social_scheduler", "community_manager", "ads_manager", "seo_toolkit"))
                        .unique()
                        .min(1)
                        .required(),
                }).validate(req.body);
                if (error)
                    return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
                await BillingService_1.billingService.convertTrialToSubscription(organizationId, features);
                return (0, responseService_1.resSender)(res, 200, "success", "Successful", null);
            }
            catch (error) {
                return (0, responseService_1.resSender)(res, 500, "error", error.message);
            }
        });
        this.upgrade = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                const organizationId = req.organizationId?._id;
                const { features } = req.body;
                const { error } = joi_1.default.object({
                    features: joi_1.default.array()
                        .items(joi_1.default.string().valid("creative_generator", "email_automation", "social_scheduler", "community_manager", "ads_manager", "seo_toolkit"))
                        .unique()
                        .min(1)
                        .required(),
                }).validate(req.body);
                if (error)
                    return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
                const result = await BillingService_1.billingService.upgradeFeatures(organizationId, features);
                return (0, responseService_1.resSender)(res, 200, "success", "Successful", null, result);
            }
            catch (error) {
                return (0, responseService_1.resSender)(res, 500, "error", error.message);
            }
        });
        this.downgrade = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                const organizationId = req.organizationId?._id;
                const { features } = req.body;
                const { error } = joi_1.default.object({
                    features: joi_1.default.array()
                        .items(joi_1.default.string().valid("creative_generator", "email_automation", "social_scheduler", "community_manager", "ads_manager", "seo_toolkit"))
                        .unique()
                        .min(1)
                        .required(),
                }).validate(req.body);
                if (error)
                    return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
                await BillingService_1.billingService.downgradeFeatures(organizationId, features);
                return (0, responseService_1.resSender)(res, 200, "success", "Successful", "Downgrade scheduled for next billing cycle");
                res.json({
                    success: true,
                    message: "Downgrade scheduled for next billing cycle",
                });
            }
            catch (error) {
                return (0, responseService_1.resSender)(res, 500, "error", error.message);
            }
        });
    }
}
exports.BillingController = BillingController;
exports.billingController = new BillingController();
