import { NextFunction, Request, Response } from "express";
import { resSender } from "../Services/responseService";
import { CustomRequest } from "../Types/CustomRequest";

export const requireRole = (...allowedRoles: string[]) => {
  return async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.membership) {
        return resSender(res, 403, "fail", "Organization context required");
      }

      if (!allowedRoles.includes(req.userRole as string)) {
        return resSender(res, 403, "fail", "Insufficient permissions");
      }

      next();
    } catch (error: any) {
      console.error("Role check error: ", error.message);
      resSender(res, 500, "error", error.message || "Failed to check role");
    }
  };
};
