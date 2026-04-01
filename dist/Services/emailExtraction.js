"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsersNameFromEmail = exports.extractEmails = void 0;
const fs = __importStar(require("fs"));
const csv = require("csv-parser");
const XLSX = __importStar(require("xlsx"));
const axios_1 = __importDefault(require("axios"));
const uploadMiddleware_1 = require("../Middlewares/uploadMiddleware");
const extractEmailsFromCSV = (filePath) => {
    console.log("Extracting emails from CSV file");
    return new Promise((resolve, reject) => {
        const emails = [];
        let isFirstRow = true;
        let emailKey = "email"; // default key
        fs.createReadStream(filePath)
            .pipe(csv())
            .on("headers", (headers) => {
            // Check if headers exist and find the email column
            const possibleKeys = ["email", "Email", "EMAIL"];
            for (const key of possibleKeys) {
                if (headers.includes(key)) {
                    emailKey = key;
                    break;
                }
            }
            isFirstRow = false;
        })
            .on("data", (row) => {
            // If first row has no headers, treat it as data
            if (isFirstRow) {
                // Try to find an email in any column
                for (const key in row) {
                    if (validateEmail(row[key])) {
                        emails.push(row[key]);
                    }
                }
                isFirstRow = false;
            }
            else {
                // Check the designated email column
                if (row[emailKey] && validateEmail(row[emailKey])) {
                    emails.push(row[emailKey]);
                }
            }
        })
            .on("end", () => {
            // If no emails found yet, try reading as raw comma-separated emails
            if (emails.length === 0) {
                const fileContent = fs.readFileSync(filePath, "utf-8");
                const potentialEmails = fileContent.split(",").map((e) => e.trim());
                potentialEmails.forEach((email) => {
                    if (validateEmail(email)) {
                        emails.push(email);
                    }
                });
            }
            resolve(emails);
        })
            .on("error", (error) => {
            reject(error);
        });
    });
};
const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};
const extractEmailsFromTXT = (filePath) => {
    console.log("Extracting emails from TXT file");
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, "utf8", (error, data) => {
            if (error) {
                return reject(error);
            }
            const emailAddresses = data.split(/[\s,]+/);
            const validEmails = emailAddresses.filter((email) => validateEmail(email));
            resolve(validEmails);
        });
    });
};
const extractEmailsFromXLSX = (filePath) => {
    console.log("Extracting emails from XLSX file");
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Get the first sheet
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    const emails = [];
    data.forEach((row) => {
        if (row.email && validateEmail(row.email)) {
            emails.push(row.email);
        }
    });
    return emails;
};
const extractEmails = async (filePath) => {
    try {
        const fileType = filePath.split(".").pop()?.toLowerCase();
        let emails = [];
        if (fileType === "csv") {
            emails = await extractEmailsFromCSV(filePath);
            // removeTmp(filePath);
            return emails;
        }
        if (fileType === "txt") {
            emails = await extractEmailsFromTXT(filePath);
            (0, uploadMiddleware_1.removeTmp)(filePath);
            return emails;
        }
        if (fileType === "xlsx" || fileType === "xls") {
            emails = extractEmailsFromXLSX(filePath);
            (0, uploadMiddleware_1.removeTmp)(filePath);
            return emails;
        }
        throw new Error("Unsupported file type. Please provide a CSV, TXT, or XLSX file.");
    }
    catch (error) {
        (0, uploadMiddleware_1.removeTmp)(filePath);
        throw new Error(`Error extracting emails: ${error}`);
    }
};
exports.extractEmails = extractEmails;
const HUNTER_API_KEY = process.env.HUNTER_API_KEY;
const getUsersNameFromEmail = async (email) => {
    try {
        const response = await axios_1.default.get(`https://api.hunter.io/v2/email-verifier`, {
            params: {
                email: email,
                api_key: HUNTER_API_KEY,
            },
        });
        const data = response.data;
        console.log("Data: ", data);
        if (data.data && data.data.status === "valid") {
            return {
                name: data.data.first_name + " " + data.data.last_name,
                email: email,
            };
        }
        else {
            throw new Error("Email is not valid or not found.");
        }
    }
    catch (error) {
        console.error("Error fetching user name:", error);
        throw error;
    }
};
exports.getUsersNameFromEmail = getUsersNameFromEmail;
