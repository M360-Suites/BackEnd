import { AdsConModel } from "../../../Models/AdModels";
import { decrypt } from "../../../Services/encryption";
import { resSender } from "../../../Services/responseService";
import { Request, Response } from "express";
import { GoogleAdsService } from "../Services/GoogleAdsService";
import { isOauthTokenExpired } from "../../../Services/tokenService";
import { AdsConnection, AdsPlatform } from "../../../Types/ads";
import adsOauth from "../Auth/ads-oauth";
import { asyncHandler } from "../../../helpers/utils";

export const getGoogleAdsAccounts = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)._id;
      const platform = req.params.platform;

      // Get the Google connection
      let connection = (await AdsConModel.findOne({
        userId,
        platform,
      })) as AdsConnection;
      if (!connection) {
        return resSender(res, 400, "fail", "Google account not connected");
      }

      // Check if token needs refresh
      if (isOauthTokenExpired(connection)) {
        try {
          console.log("Token expired, refreshing...");
          const refreshedConnection = await adsOauth.refreshToken(connection);
          // console.log("Refershed connection: ", refreshedConnection);
          // console.log('New accessToken: ', decrypt(refreshedConnection.accessToken));

          // Update the connection with the refreshed token
          connection = refreshedConnection;
        } catch (err: any) {
          return {
            success: false,
            error:
              err.message || "Token refresh failed. Please re-authenticate.",
            platform,
          };
        }
      }

      // Initialize Google Ads service
      const googleAdsService = new GoogleAdsService(
        decrypt(connection.accessToken)
      );

      // Get accessible accounts
      const accessibleAccounts =
        await googleAdsService.getAccessibleAccountsWithDetails();

      return resSender(
        res,
        200,
        "success",
        "Google Ads accounts retrieved",
        null,
        accessibleAccounts
      );
    } catch (error: any) {
      console.error("Error getting Google Ads accounts:", error);
      return resSender(
        res,
        500,
        "error",
        error.message || "Error retrieving Google Ads accounts"
      );
    }
  }
);

export const createGoogleCampaign = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { platform, campaignData } = req.body;
      const userId = (req.user as any)._id;

      // console.log('Got campaign req: ', { platform, campaignData});

      // Validate platform
      if (
        !Object.values(AdsPlatform).includes(platform as AdsPlatform) ||
        !campaignData
      ) {
        return resSender(res, 400, "fail", "Invalid request");
      }

      // Retrieve connection
      let connection = (await AdsConModel.findOne({
        userId,
        platform,
      })) as AdsConnection;
      if (!connection) {
        return resSender(
          res,
          400,
          "fail",
          "Platform not connected. Please authenticate first."
        );
      }

      // Refresh connection if expired
      if (isOauthTokenExpired(connection)) {
        try {
          console.log("Token expired, refreshing...");
          const refreshedConnection = await adsOauth.refreshToken(connection);

          // Update the connection with the refreshed token
          connection = refreshedConnection;
        } catch (err: any) {
          return {
            success: false,
            error:
              err.message || "Token refresh failed. Please re-authenticate.",
            platform,
          };
        }
      }

      const googleAdsSer = new GoogleAdsService(
        decrypt(connection.accessToken)
      );
      const customerAcc = await googleAdsSer.getAccessibleAccounts();

      const result = await googleAdsSer.createCampaign(
        customerAcc[1].customerId,
        campaignData
      );
      console.log("Cam Res: ", result);

      return resSender(res, 200, "success", "Success", result);
    } catch (error: any) {
      console.error("Error creating Google Ad:", error);
      return resSender(
        res,
        500,
        "error",
        error.message || "Error creating Google Ads campaign"
      );
    }
  }
);

export const getGoogleCampaigns = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { platform } = req.params;
      const userId = (req.user as any)._id;

      // console.log('Got campaign req: ', { platform});

      // Validate platform
      if (!Object.values(AdsPlatform).includes(platform as AdsPlatform)) {
        return resSender(res, 400, "fail", "Invalid request");
      }

      // Retrieve connection
      let connection = (await AdsConModel.findOne({
        userId,
        platform,
      })) as AdsConnection;
      if (!connection) {
        return resSender(
          res,
          400,
          "fail",
          "Platform not connected. Please authenticate first."
        );
      }

      // Refresh connection if expired
      if (isOauthTokenExpired(connection)) {
        try {
          console.log("Token expired, refreshing...");
          const refreshedConnection = await adsOauth.refreshToken(connection);

          // Update the connection with the refreshed token
          connection = refreshedConnection;
        } catch (err: any) {
          return {
            success: false,
            error:
              err.message || "Token refresh failed. Please re-authenticate.",
            platform,
          };
        }
      }

      const googleAdsSer = new GoogleAdsService(
        decrypt(connection.accessToken)
      );
      const customerAcc = await googleAdsSer.getAccessibleAccounts();

      const result = await googleAdsSer.getGoogleCampaigns(
        customerAcc[1].customerId
      );
      console.log("Cam Res: ", result);

      return resSender(res, 200, "success", "Success", null, result);
    } catch (error: any) {
      console.error("Error fetching Google Campaigns:", error);
      return resSender(
        res,
        500,
        "error",
        error.message || "Error fetching Google campaign"
      );
    }
  }
);
