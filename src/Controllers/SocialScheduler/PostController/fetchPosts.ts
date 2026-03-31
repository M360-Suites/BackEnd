import { Request, Response } from "express";
import { resSender } from "../../../Services/responseService";
import { Post } from "../../../Models/SocialModels";
import { asyncHandler } from "../../../helpers/utils";
import { CustomRequest } from "../../../Types/CustomRequest";

export const fetchPosts = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const userId = (req.user as any)._id;
      const orgId = (req.organizationId)?._id;

      const posts = await Post.find({ orgId });
      return resSender(
        res,
        200,
        "success",
        "Posts fetched successfully",
        null,
        posts
      );
    } catch (error: any) {
      console.log("Error fetching posts: ", error.message);
      return resSender(res, 500, "error", error.message || "Server Error");
    }
  }
);
