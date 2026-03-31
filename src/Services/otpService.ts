import Otp from "../Models/Otp";
import bcrypt from "bcryptjs";
import { forgetPassword, trialMail } from "../Mails/otpMail";
import { logger } from "../logger/logger";
import { generateToken } from "./tokenService";
import { sendMail } from "./newMailService";

const jwtAccess = process.env.ACCESS_SECRET as string;

/**
 *
 * @param email
 * @param reason
 * @returns state - boolean value
 */
export const createAndSendOtp = async (
  email: string,
  reason: string = "trial"
) => {
  try {
    let verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    let otpRecord = await Otp.findOne({ email, reason });

    // Hash the OTP before storing
    const salt = await bcrypt.genSalt(10);
    const hashedOTP = await bcrypt.hash(verificationCode, salt);

    if (otpRecord) {
      otpRecord.otp = hashedOTP;
      //   otpRecord.expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString; //Update the expires time
    } else {
      otpRecord = new Otp({
        email,
        otp: hashedOTP,
        reason,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Set expiration time
      });
    }
    await otpRecord.save();
    console.log("Code: ", verificationCode);

    // Select email template and subject based on reason
    let emailSubject = "";
    let emailContent;

    // Filter email template based on reason
    switch (reason) {
      case "forgotPassword":
        emailSubject = "Password Reset Request";
        emailContent = forgetPassword({
          firstName: email,
          otp: verificationCode,
        });
        break;
      case "verifyEmail":
        emailSubject = "Email Verification";
        emailContent = trialMail({ firstName: email, otp: verificationCode });
        break;
      case "trial":
        emailSubject = "Free Trial Verification";
        emailContent = trialMail({ firstName: email, otp: verificationCode }); // Using forgetPassword as fallback
        break;
      default:
        emailSubject = "Verification Code";
        emailContent = forgetPassword({
          firstName: email,
          otp: verificationCode,
        }); // Default to forgetPassword
    }

    let sent: boolean = false;
    await sendMail(email, emailSubject, emailContent, process.env.NOREPLY_EMAIL!)
      .then(() => {
        logger.info("Email Sent");
        sent = true;
      })
      .catch((err) => {
        logger.info("Email not Sent");
        sent = false;
        console.log('Error: ', err);
        throw err;
      });
    return sent;
  } catch (error) {
    console.log('Error')
    throw error;
  }
};

/**
 *
 * @param code The recieved code from user
 * @param email User's email adddress
 * @param reason Reason for code request and verification
 * @returns Token to authenticate the next action
 */
export const verifyOtp = async (
  code: string,
  email: string,
  reason: string
) => {
  try {
    let savedOtp = await Otp.findOne({ email, reason });
    if (!savedOtp) throw new Error("Verification code is invalid or expired");

    const isExpired = new Date(savedOtp.expiresAt) < new Date();
    if (isExpired) {
      await Otp.deleteOne({ _id: savedOtp._id });
      throw new Error("Verification code is invalid or expired");
    }

    const isValid = await bcrypt.compare(code, savedOtp.otp);
    if (!isValid) throw new Error("Verification code is invalid or expired");

    let payload = {
      userId: '',
      email,
      emailVerified: reason === "trial",
    };
    // console.log('Payload: ', payload);
    const token = generateToken(payload, jwtAccess, {
      expiresIn: reason == "trial" ? "365d" : "10m",
    });
    return token;
  } catch (error) {
    console.log('Error');
    throw error;
  }
};
