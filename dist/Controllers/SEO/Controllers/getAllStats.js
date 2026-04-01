"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSiteClarityData = exports.analyzeSite = exports.getAllStats = void 0;
const utils_1 = require("../../../helpers/utils");
const responseService_1 = require("../../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
const seo_1 = require("../Services/seo");
const seo_2 = require("../../../Types/seo");
const MicrosoftClarity_1 = require("../Services/seo/MicrosoftClarity");
const getUserCred_1 = require("../Services/getUserCred");
exports.getAllStats = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        // console.log('UserId: ', userId);
        const { url } = req.body;
        const { error } = joi_1.default.object({
            url: validationSchema_1.default.url,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        // const seoCred = await SeoCred
        return (0, responseService_1.resSender)(res, 200, "success", "Successful");
    }
    catch (error) {
        return (0, responseService_1.resSender)(res, 500, "error", error.message);
    }
});
exports.analyzeSite = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user._id;
        const { url } = req.query;
        const { error } = joi_1.default.object({
            url: validationSchema_1.default.url,
        }).validate(req.query);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        const config = await (0, getUserCred_1.getUserCreds)(userId, url);
        console.log("Dets: ", { url, key: config.pageSpeed.apiKey });
        const seoClass = new seo_1.SEOService(config);
        // const pageSPeedService = seoClass.getServices().pageSpeed;
        // const result0 = await pageSPeedService.analyzeUrlComprehensive(url as string);
        const result = await seoClass.analyzeSEO(url);
        return (0, responseService_1.resSender)(res, 200, "success", "Success", null, result);
    }
    catch (error) {
        console.log("Error analyzing site: ", error.message);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error");
    }
});
exports.getSiteClarityData = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { dimensions } = req.body;
        console.log("Body: ", req.body);
        const { error } = joi_1.default.object({
            dimensions: joi_1.default.array().items(joi_1.default.string()),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        let apiKey = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjQ4M0FCMDhFNUYwRDMxNjdEOTRFMTQ3M0FEQTk2RTcyRDkwRUYwRkYiLCJ0eXAiOiJKV1QifQ.eyJqdGkiOiJmMTA3NGUwYy1jMDZhLTQzYjEtOTI2OS04MGIzMzVhODQxNTYiLCJzdWIiOiIzMDEwMTI5ODY5MTYxNzczIiwic2NvcGUiOiJEYXRhLkV4cG9ydCIsIm5iZiI6MTc2MTA5OTAxOCwiZXhwIjo0OTE0Njk5MDE4LCJpYXQiOjE3NjEwOTkwMTgsImlzcyI6ImNsYXJpdHkiLCJhdWQiOiJjbGFyaXR5LmRhdGEtZXhwb3J0ZXIifQ.i7Pv0IIbZrkAnd_kxoenPtNI2VI7QA4lqbL0SjguxbNezdTRVFfl1LdgBo4RQP83szHuhRLGfCnahhHQ3RMq-OPILiLfR28ccQywBlBaDbCxSt1s3dws_FcchIH18WGlx_PgG2FLSomwLcq-s9Liau1-N2mPkreg8Xa0osgXOzgeSuJRIF2nt2fF03eDiFGFJKWSXSpQbUoi0p2JdSlbppgLEmD2vjxThugzwB7xpPYX5BuFBMlupHtJpxCeGBxIn4-Lb61RvCsbMhq749ghhPfeBFsHwUVLs7mZIQQcxrV8aOIDLSSUz0vAyUFmoVXK_rJNiyrX58rAP_hslVFsOA";
        const clarityService = new MicrosoftClarity_1.MicrosoftClarityService("", apiKey);
        const clarityData = await clarityService.getSiteData(3, [
            seo_2.ClarityDimensions.OS,
            seo_2.ClarityDimensions.Browser,
        ]);
        return (0, responseService_1.resSender)(res, 200, "success", "Successful", null, clarityData);
    }
    catch (error) {
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "");
    }
});
// const preMetrics = response.loadingExperience;
// const lighthouse = response.lighthouseResult;
// const audits = lighthouse.audits;
// console.log("Metrics: ", preMetrics);
// console.log("Lighthouse Result: ", response.lighthouseResult);
// console.log("Audits Result: ", lighthouse.audits);
