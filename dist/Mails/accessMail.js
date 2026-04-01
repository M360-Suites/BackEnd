"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountAccessMail = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const handlebars_1 = __importDefault(require("handlebars"));
const accountAccessMail = ({ firstName, invitor, accountName, accessUrl }) => {
    // Read Template
    const htmlTemplate = fs_1.default.readFileSync(path_1.default.join(__dirname, "..", "public", "mail", "accountAccess.html"), "utf-8");
    // Compile Templates
    const template = handlebars_1.default.compile(htmlTemplate);
    // Generate final HTML content
    const htmlContent = template({ firstName, invitor, accountName, accessUrl });
    return htmlContent;
};
exports.accountAccessMail = accountAccessMail;
