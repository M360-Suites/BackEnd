import { Request, Response } from "express";
import { resSender } from "../../../Services/responseService";
import Joi from "joi";
import { PostContent, SocialPlatform } from "../../../Types/types";
import { post, postToMultiplePlatforms } from "../Posting/postService";
import { Readable } from "stream";
import { Post } from "../../../Models/SocialModels";
import { addBatchPostJobs, addPostJob } from "../queueService";
import { asyncHandler } from "../../../helpers/utils";
import { CustomRequest } from "../../../Types/CustomRequest";

export const createPost = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const userId = (req.user as any)._id;
      const orgId = (req.organizationId)?._id;
      const { platform } = req.params;
      let content: PostContent = req.body;
      // console.log('Content 1: ', content);

      if (!Object.values(SocialPlatform).includes(platform as SocialPlatform))
        return resSender(res, 400, "fail", "Invalid Platform!");

      const { error } = Joi.object({
        text: Joi.string(),
        // imageUrl: Joi.string().uri(),
        // videoUrl: Joi.string().uri(),
        title: Joi.string(),
        description: Joi.string(),
        scheduledAt: Joi.date(),
      }).validate(content);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      const file = req.file;
      const files = req.files;

      if (file) {
        console.log("File: ", file);
        content = {
          ...content,
          files: [file],
        };
      }
      if (files) {
        // console.log("Files: ", files);
        content = {
          ...content,
          files: files as any,
        };
      }
      // console.log("Content 2: ", content);

      const result = await post(orgId as string, platform as SocialPlatform, content);
      console.log("Result: ", result);

      // For Queuing
      // addPostJob(userId, platform as SocialPlatform, content)

      if (!result.success)
        throw new Error(result.error || "Error occurred while posting!");

      let newPost = new Post({
        userId,
        orgId,
        text: content.text,
        description: content.description,
        platforms: [{ platform, postId: result.postId }],
      });
      await newPost.save();

      return resSender(res, 200, "success", "Post Successful!", null, result);
    } catch (error: any) {
      console.log("Error creating post: ", error);
      return resSender(
        res,
        500,
        "error",
        error.message || "Error creating Post!"
      );
    }
  }
);

export const createMultiPost = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const userId = (req.user as any)._id;
      const orgId = (req.organizationId)?._id;
      let {
        platforms,
        content,
      }: { platforms: SocialPlatform[]; content: any } = req.body;

      content = JSON.parse(content);

      // console.log("Request body: ", req.body);

      const { error } = Joi.object({
        text: Joi.string(),
        // imageUrl: Joi.string().uri(),
        // videoUrl: Joi.string().uri(),
        title: Joi.string(),
        description: Joi.string(),
        scheduledAt: Joi.date(),
      }).validate(content);
      if (error) return resSender(res, 400, "fail", error.details[0].message);

      if (!platforms || platforms.length < 1)
        return resSender(res, 400, "fail", "No platforms selected!");

      const file = req.file;
      const files = req.files;

      if (file) {
        console.log("File: ", file);
        content = {
          ...content,
          files: [file],
        };
      }
      if (files) {
        // console.log("Files: ", files);
        content = {
          ...content,
          files: files as any,
        };
      }

      // console.log('Content: ', content);

      const results = await postToMultiplePlatforms(
        orgId as string,
        platforms,
        content as PostContent
      );

      // For Queuing
      // addBatchPostJobs(userId, platforms, content as PostContent);

      // Log summary
      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      console.log(`Sent ${successful} posts successfully, ${failed} failed`);

      return resSender(
        res,
        200,
        "success",
        `Sent ${successful} posts successfully, ${failed} failed`,
        null,
        { logs: results }
      );
    } catch (error: any) {
      console.log("Error creating multiple post: ", error);
      return resSender(
        res,
        500,
        "fail",
        error.message || "Error creating multiple posts"
      );
    }
  }
);
