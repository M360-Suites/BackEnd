"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addContacts = void 0;
const logger_1 = require("../../../logger/logger");
const responseService_1 = require("../../../Services/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../../Services/validationSchema"));
const Campaign_1 = require("../../../Models/Campaign");
const emailExtraction_1 = require("../../../Services/emailExtraction");
const User_1 = require("../../../Models/User");
const utils_1 = require("../../../helpers/utils");
exports.addContacts = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const { error } = joi_1.default.object({
            emails: joi_1.default.array().items(validationSchema_1.default.email).optional(),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
        const { emails } = req.body;
        if (!emails && !req.file)
            return (0, responseService_1.resSender)(res, 400, "fail", "Emails addresses or email file is required");
        let contacts = [];
        if (emails) {
            console.log("Emails: ", emails);
            emails.map(async (email) => {
                // let name = (await getUsersNameFromEmail(email)).name;
                let newContact = new Campaign_1.Subscriber({
                    subscribee: (req.organizationId)?._id,
                    email,
                    name: "Unknown Name",
                    status: "Active",
                });
                contacts.push(newContact);
            });
        }
        // console.log("Contacts 1: ", contacts);
        // If a file is uploaded, extract emails from the file
        if (req.file) {
            const filePath = req.file.path;
            const fetchedEmails = await (0, emailExtraction_1.extractEmails)(filePath);
            console.log("Fetched Emails: ", fetchedEmails);
            fetchedEmails.map(async (email) => {
                // let name = (await getUsersNameFromEmail(email)).name;
                let newContact = new Campaign_1.Subscriber({
                    subscribee: (req.organizationId)?._id,
                    email,
                    name: "Unknown Name",
                    status: "Active",
                });
                contacts.push(newContact);
            });
        }
        console.log("Contacts: ", contacts);
        if (contacts.length < 1)
            return (0, responseService_1.resSender)(res, 400, "fail", "No contacts to add");
        if (contacts.length > 1000)
            return (0, responseService_1.resSender)(res, 400, "fail", "You can only add a maximum of 1000 contacts at a time");
        // await Promise.all(
        await Campaign_1.Subscriber.insertMany(contacts);
        await User_1.Organization.findByIdAndUpdate((req.organizationId)?._id, { $set: { emailAutoOnboarding: 2 } }, { new: true });
        // );
        return (0, responseService_1.resSender)(res, 200, "success", "Contacts added successfully", null, contacts);
    }
    catch (error) {
        logger_1.logger.error("Error adding contacts:", error);
        return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error adding contacts");
    }
});
