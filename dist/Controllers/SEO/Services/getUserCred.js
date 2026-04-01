"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserCreds = void 0;
const SEOModels_1 = require("../../../Models/SEOModels");
const encryption_1 = require("../../../Services/encryption");
const getUserCreds = async (userId, url) => {
    try {
        const cred = await SEOModels_1.SeoCredModel.findOne({ userId, url });
        let rCred = {
            pageSpeed: {
                apiKey: process.env.GOOGLE_API_KEY,
            },
            serpTracking: {
                apiKey: process.env.SERP_KEY,
            },
            googleAnalytics: {
                apiSecret: "",
                propertyId: "",
                measurementId: "",
            },
            microsoftClarity: {
                projectId: "",
                apiKey: "",
            },
        };
        if (cred) {
            rCred.googleAnalytics.apiSecret = cred.googleAnalytics?.apiSecret
                ? (0, encryption_1.decrypt)(cred.googleAnalytics?.apiSecret)
                : "";
            rCred.googleAnalytics.measurementId = cred.googleAnalytics?.measurementId;
            rCred.googleAnalytics.propertyId = cred.googleAnalytics?.propertyId;
            rCred.microsoftClarity.projectId = cred.microsoftClarity.projectId;
            rCred.microsoftClarity.apiKey = cred.googleAnalytics.apiSecret
                ? (0, encryption_1.decrypt)(cred.googleAnalytics?.apiSecret)
                : "";
            // let rCred: SEOConfig = {
            //   pageSpeed: {
            //     apiKey: process.env.GOOGLE_API_KEY!,
            //   },
            //   serpTracking: {
            //     apiKey: process.env.SERP_KEY!,
            //   },
            //   googleAnalytics: {
            //     apiSecret: cred.googleAnalytics?.apiSecret
            //       ? decrypt(cred.googleAnalytics?.apiSecret)
            //       : "",
            //     propertyId: cred.googleAnalytics?.propertyId!,
            //     measurementId: cred.googleAnalytics?.measurementId!,
            //   },
            //   microsoftClarity: {
            //     projectId: cred.microsoftClarity?.projectId!,
            //     apiKey: cred.microsoftClarity?.apiKey
            //       ? decrypt(cred.microsoftClarity?.apiKey)
            //       : "",
            //   },
            // };
        }
        return rCred;
    }
    catch (error) {
        console.log('Error');
        throw error;
    }
};
exports.getUserCreds = getUserCreds;
