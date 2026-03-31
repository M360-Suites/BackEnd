import nodemailer from "nodemailer";
import fs from "fs";
import { promisify } from "util";
import path from "path";
import { logger } from "../logger/logger";
import { google } from 'googleapis';
import { AuthProvider, Client } from '@microsoft/microsoft-graph-client';
import axios from 'axios';
import { decrypt } from './encryption';
import { error } from 'console';

const readFileAsync = promisify(fs.readFile);

const normalEmail = process.env.NORMAL_EMAIL;
const normalEmailPassword = process.env.NORMAL_EMAIL_PASSWORD;
const noReplyEmail = process.env.NOREPLY_EMAIL;
const noReplyPassword = process.env.NOREPLY_PASSWORD;
const smtp = process.env.HOST_SMTP;

// Transporter for normal email
const normalTranspoter = nodemailer.createTransport({
  host: smtp,
  port: 465,
  secure: true,
  auth: {
    user: normalEmail,
    pass: normalEmailPassword,
  },
});

// Transporter for no-reply email
const noReplyEmailTransporter = nodemailer.createTransport({
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
export const sendMail = async (
  mailRecipient: string,
  subject: string,
  mailContent: any,
  mailSender: any
) => {
  const icon = await readFileAsync(
    path.join(__dirname, "..", "public", "assets", "images", "logo.png")
  );
  // Choose the correct transporter based on the sender
  const transporter =
    mailSender === noReplyEmail ? noReplyEmailTransporter : normalTranspoter;

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
    transporter.sendMail(mailOptions, (error: any, info) => {
      if (error) {
        logger.error("Error occurred:", error.message);
        reject(error); // Reject the promise if there is an error
      } else {
        logger.info("Email sent successfully!");
        console.log("Message ID:", info.messageId);
        logger.info(info.response);
        resolve(info); // Resolve the promise if the email is sent
      }
    });
  });
};



interface TokenRecord {
  provider: string | "google" | "microsoft" | "zoho" | "custom";
  email: string;
  accessToken?: string;
  refreshToken?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpPassword?: string;
}

/**
 * Function to send mails from user's mail accounts
 * @param token All necessary credentials needed to send mails
 * @param to Mail Recipient
 * @param subject Subject of the mail
 * @param text Content of the mail..
 * @returns Result of mail sending operation
 */
export async function sendEmail(
  token: TokenRecord,
  to: string,
  subject: string,
  text: string
) {
  // Decrypt sensitive fields before use
  if (token.accessToken) token.accessToken = decrypt(token.accessToken);
  if (token.refreshToken) token.refreshToken = decrypt(token.refreshToken);
  if (token.smtpPassword) token.smtpPassword = decrypt(token.smtpPassword);

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

async function sendViaGmail(
  token: TokenRecord,
  to: string,
  subject: string,
  text: string
) {
  let serverUrl =
    process.env.NODE_ENV === "development"
      ? process.env.SERVER_URL
      : process.env.PROD_URL;

  console.log("Sending from: ", token.email);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${serverUrl}/api/campaigns/google/callback`;

  console.log("Creds: ", { clientId, clientSecret });

  const oAuth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  oAuth2Client.setCredentials({ refresh_token: token.refreshToken });
  const accessToken = await oAuth2Client.getAccessToken();

  console.log("OAuth2 cred: ", oAuth2Client.credentials);

  const transporter = nodemailer.createTransport({
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
    transporter.sendMail(
      { from: token.email, to, subject, text },
      (error: any, info) => {
        if (error) {
          console.error("Error sending Campaign,", error);
          reject(error);
        } else {
          logger.info("Campaign Sent");
          console.log("Res: ", info.response);
          resolve(info);
        }
      }
    );
  });
}

async function sendViaMicrosoft(
  token: TokenRecord,
  to: string,
  subject: string,
  text: string
) {
  const authProvider: AuthProvider = (done) => {
    done(null, token.accessToken!);
  };

  const client = Client.init({ authProvider });

  return client.api("/me/sendMail").post({
    message: {
      subject,
      body: { contentType: "Text", content: text },
      toRecipients: [{ emailAddress: { address: to } }],
    },
    saveToSentItems: true,
  });
}

async function sendViaZoho(
  token: TokenRecord,
  to: string,
  subject: string,
  text: string
) {
  return axios.post(
    "https://mail.zoho.com/api/accounts/{accountId}/messages",
    {
      fromAddress: token.email,
      toAddress: to,
      subject,
      content: text,
    },
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${token.accessToken}`,
      },
    }
  );
}

async function sendViaSmtp(
  token: TokenRecord,
  to: string,
  subject: string,
  text: string
) {
  const transporter = nodemailer.createTransport({
    host: token.smtpHost,
    port: token.smtpPort || 465,
    secure: token.smtpSecure || true,
    auth: {
      user: token.email,
      pass: token.smtpPassword,
    },
  });

  return new Promise((resolve, reject) => {
    transporter.sendMail(
      { from: token.email, to, subject, text },
      (error: any, info) => {
        if (error) {
          console.error("Error sending Campaign,", error);
          reject(error);
        } else {
          logger.info("Campaign Sent");
          console.log("Res: ", info.response);
          resolve(info);
        }
      }
    );
  });
}
