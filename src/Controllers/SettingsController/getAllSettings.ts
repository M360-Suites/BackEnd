import { Request, Response } from "express";
import { asyncHandler } from "../../helpers/utils";
import { resSender } from "../../Services/responseService";
import { Settings } from "../../Models/Settings";
import { CustomRequest } from "../../Types/CustomRequest";

export const fetchAllSettings = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const userId = (req.user as any)._id;

      const setting = await Settings.findOne({ userId });

      console.log(`Settings for user ${userId} : ${setting}`);

      return resSender(res, 200, "success", "Successful", null, setting);
    } catch (error: any) {
      console.log("Error fetching settings: ", error.message);
      return resSender(
        res,
        500,
        "error",
        error.message || "Settings fetch failed"
      );
    }
  }
);

export const retrieveSetting = async (userId: string) => {
  try {
    const setting = await Settings.findOne({ userId });
    return setting;
  } catch (error) {
    console.log('Error');
    throw error;
  }
};
