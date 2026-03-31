import * as fs from "fs";
import csv = require("csv-parser");
import * as XLSX from "xlsx";
import axios from "axios";
import { removeTmp } from "../Middlewares/uploadMiddleware";

interface EmailData {
  email: string;
}

const extractEmailsFromCSV = (filePath: string): Promise<string[]> => {
  console.log("Extracting emails from CSV file");
  return new Promise((resolve, reject) => {
    const emails: string[] = [];
    let isFirstRow = true;
    let emailKey = "email"; // default key

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("headers", (headers: string[]) => {
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
      .on("data", (row: any) => {
        // If first row has no headers, treat it as data
        if (isFirstRow) {
          // Try to find an email in any column
          for (const key in row) {
            if (validateEmail(row[key])) {
              emails.push(row[key]);
            }
          }
          isFirstRow = false;
        } else {
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
      .on("error", (error: any) => {
        reject(error);
      });
  });
};

const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const extractEmailsFromTXT = (filePath: string): Promise<string[]> => {
  console.log("Extracting emails from TXT file");
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (error, data) => {
      if (error) {
        return reject(error);
      }

      const emailAddresses = data.split(/[\s,]+/);
      const validEmails = emailAddresses.filter((email) =>
        validateEmail(email)
      );
      resolve(validEmails);
    });
  });
};

const extractEmailsFromXLSX = (filePath: string): string[] => {
  console.log("Extracting emails from XLSX file");
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // Get the first sheet
  const worksheet = workbook.Sheets[sheetName];
  const data: any[] = XLSX.utils.sheet_to_json(worksheet);

  const emails: string[] = [];
  data.forEach((row) => {
    if (row.email && validateEmail(row.email)) {
      emails.push(row.email);
    }
  });

  return emails;
};

export const extractEmails = async (filePath: string): Promise<string[]> => {
  try {
    const fileType = filePath.split(".").pop()?.toLowerCase();

    let emails: string[] = [];

    if (fileType === "csv") {
      emails = await extractEmailsFromCSV(filePath);
      // removeTmp(filePath);
      return emails;
    }
    if (fileType === "txt") {
      emails = await extractEmailsFromTXT(filePath);
      removeTmp(filePath);
      return emails;
    }
    if (fileType === "xlsx" || fileType === "xls") {
      emails = extractEmailsFromXLSX(filePath);
      removeTmp(filePath);
      return emails;
    }
    throw new Error(
      "Unsupported file type. Please provide a CSV, TXT, or XLSX file."
    );
  } catch (error) {
    removeTmp(filePath);
    throw new Error(`Error extracting emails: ${error}`);
  }
};

const HUNTER_API_KEY = process.env.HUNTER_API_KEY;

export const getUsersNameFromEmail = async (email: string) => {
  try {
    const response = await axios.get(
      `https://api.hunter.io/v2/email-verifier`,
      {
        params: {
          email: email,
          api_key: HUNTER_API_KEY,
        },
      }
    );

    const data = response.data;
    console.log("Data: ", data);
    if (data.data && data.data.status === "valid") {
      return {
        name: data.data.first_name + " " + data.data.last_name,
        email: email,
      };
    } else {
      throw new Error("Email is not valid or not found.");
    }
  } catch (error) {
    console.error("Error fetching user name:", error);
    throw error;
  }
};
