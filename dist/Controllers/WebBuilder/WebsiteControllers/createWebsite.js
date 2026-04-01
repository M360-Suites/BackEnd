"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebsite = void 0;
const Website_1 = require("../../../Models/Website");
const responseService_1 = require("../../../Services/responseService");
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
const joi_1 = __importDefault(require("joi"));
const User_1 = require("../../../Models/User");
const createWebsite = async (req, res) => {
    try {
        const { name, url, description } = req.body;
        const { error } = joi_1.default.object({
            name: validationSchema_1.default.name,
            url: validationSchema_1.default.url,
            description: validationSchema_1.default.text
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        if (!name || !url)
            return (0, responseService_1.resSender)(res, 400, "fail", "Name and URL are required");
        // Check if the website already exists
        const existingWebsite = await Website_1.Website.findOne({ url });
        if (existingWebsite)
            return (0, responseService_1.resSender)(res, 400, "fail", "Website url already exists");
        // Create a new website
        const newWebsite = new Website_1.Website({
            name,
            url,
            description,
            orgId: req.organizationId?._id,
            createdBy: req.user._id, // Assuming you have user authentication middleware
        });
        await newWebsite.save();
        await User_1.Organization.findByIdAndUpdate((req.organizationId)?._id, { $push: { websites: newWebsite._id } }, { new: true });
        return (0, responseService_1.resSender)(res, 201, "success", "Website created successfully", null, newWebsite);
    }
    catch (error) {
        console.error("Error creating website:", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Server error");
    }
};
exports.createWebsite = createWebsite;
