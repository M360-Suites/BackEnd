"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = void 0;
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
const logger_1 = require("../logger/logger");
const googleapis_1 = require("googleapis");
const microsoft_graph_client_1 = require("@microsoft/microsoft-graph-client");
const axios_1 = __importDefault(require("axios"));
const encryption_1 = require("./encryption");
const readFileAsync = (0, util_1.promisify)(fs_1.default.readFile);
const normalEmail = process.env.NORMAL_EMAIL;
const normalEmailPassword = process.env.NORMAL_EMAIL_PASSWORD;
const noReplyEmail = process.env.NOREPLY_EMAIL;
const noReplyPassword = process.env.NOREPLY_PASSWORD;
const smtp = process.env.HOST_SMTP;
// Transporter for normal email
const normalTranspoter = nodemailer_1.default.createTransport({
    host: smtp,
    port: 465,
    secure: true,
    auth: {
        user: normalEmail,
        pass: normalEmailPassword,
    },
});
// Transporter for no-reply email
const noReplyEmailTransporter = nodemailer_1.default.createTransport({
    host: smtp,
    port: 465,
    secure: true,
    auth: {
        user: noReplyEmail,
        pass: noReplyPassword,
    },
});
// Function to send an email
/**
 *
 * @param mailRecipient The Recipient of the mail
 * @param subject Subject of mail
 * @param mailContent COntent of the mail
 * @param mailSender mail sender account
 * @returns Result of mail sending operation
 */
const sendMail = async (mailRecipient, subject, mailContent, mailSender) => {
    const icon = await readFileAsync(path_1.default.join(__dirname, "..", "public", "assets", "images", "logo.png"));
    // Choose the correct transporter based on the sender
    const transporter = mailSender === noReplyEmail ? noReplyEmailTransporter : normalTranspoter;
    // Setup email data
    let mailOptions = {
        from: mailSender === noReplyEmail ? noReplyEmail : normalEmail,
        to: mailRecipient,
        subject: subject,
        html: mailContent,
        attachments: [
            {
                filename: "icon.png",
                content: icon,
                encoding: "base64",
                cid: "icon@m360suites.com",
            },
        ],
    };
    // Return a promise to handle the asynchronous nature
    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                logger_1.logger.error("Error occurred:", error.message);
                reject(error); // Reject the promise if there is an error
            }
            else {
                logger_1.logger.info("Email sent successfully!");
                console.log("Message ID:", info.messageId);
                logger_1.logger.info(info.response);
                resolve(info); // Resolve the promise if the email is sent
            }
        });
    });
};
exports.sendMail = sendMail;
/**
 * Function to send mails from user's mail accounts
 * @param token All necessary credentials needed to send mails
 * @param to Mail Recipient
 * @param subject Subject of the mail
 * @param text Content of the mail..
 * @returns Result of mail sending operation
 */
async function sendEmail(token, to, subject, text) {
    // Decrypt sensitive fields before use
    if (token.accessToken)
        token.accessToken = (0, encryption_1.decrypt)(token.accessToken);
    if (token.refreshToken)
        token.refreshToken = (0, encryption_1.decrypt)(token.refreshToken);
    if (token.smtpPassword)
        token.smtpPassword = (0, encryption_1.decrypt)(token.smtpPassword);
    switch (token.provider) {
        case "google":
            return sendViaGmail(token, to, subject, text);
        case "microsoft":
            return sendViaMicrosoft(token, to, subject, text);
        case "zoho":
            return sendViaZoho(token, to, subject, text);
        case "custom":
            return sendViaSmtp(token, to, subject, text);
    }
}
async function sendViaGmail(token, to, subject, text) {
    let serverUrl = process.env.NODE_ENV === "development"
        ? process.env.SERVER_URL
        : process.env.PROD_URL;
    console.log("Sending from: ", token.email);
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${serverUrl}/api/campaigns/google/callback`;
    console.log("Creds: ", { clientId, clientSecret });
    const oAuth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oAuth2Client.setCredentials({ refresh_token: token.refreshToken });
    const accessToken = await oAuth2Client.getAccessToken();
    console.log("OAuth2 cred: ", oAuth2Client.credentials);
    const transporter = nodemailer_1.default.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: token.email,
            clientId,
            clientSecret,
            refreshToken: token.refreshToken,
            accessToken: accessToken.token || undefined,
        },
    });
    return new Promise((resolve, reject) => {
        transporter.sendMail({ from: token.email, to, subject, text }, (error, info) => {
            if (error) {
                console.error("Error sending Campaign,", error);
                reject(error);
            }
            else {
                logger_1.logger.info("Campaign Sent");
                console.log("Res: ", info.response);
                resolve(info);
            }
        });
    });
}
async function sendViaMicrosoft(token, to, subject, text) {
    const authProvider = (done) => {
        done(null, token.accessToken);
    };
    const client = microsoft_graph_client_1.Client.init({ authProvider });
    return client.api("/me/sendMail").post({
        message: {
            subject,
            body: { contentType: "Text", content: text },
            toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: true,
    });
}
async function sendViaZoho(token, to, subject, text) {
    return axios_1.default.post("https://mail.zoho.com/api/accounts/{accountId}/messages", {
        fromAddress: token.email,
        toAddress: to,
        subject,
        content: text,
    }, {
        headers: {
            Authorization: `Zoho-oauthtoken ${token.accessToken}`,
        },
    });
}
async function sendViaSmtp(token, to, subject, text) {
    const transporter = nodemailer_1.default.createTransport({
        host: token.smtpHost,
        port: token.smtpPort || 465,
        secure: token.smtpSecure || true,
        auth: {
            user: token.email,
            pass: token.smtpPassword,
        },
    });
    return new Promise((resolve, reject) => {
        transporter.sendMail({ from: token.email, to, subject, text }, (error, info) => {
            if (error) {
                console.error("Error sending Campaign,", error);
                reject(error);
            }
            else {
                logger_1.logger.info("Campaign Sent");
                console.log("Res: ", info.response);
                resolve(info);
            }
        });
    });
}
