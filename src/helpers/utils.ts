import { NextFunction, Request, Response } from "express";
import { CustomRequest } from "../Types/CustomRequest";

export const errorFunction = (scenarioName: any) => {
  let returnFunction = (error: any) => {
    console.log("An error occurred while processing, " + scenarioName);
    console.log("Error Message:" + error);
    console.log("Error Stack:" + error.stack);
  };
  return returnFunction;
};

// A utility function to wrap async controllers
export const asyncHandler =
  <T extends (...args: any[]) => any>(fn: T) =>
  (req: CustomRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(errorFunction(next));
  };
