import { Request, Response } from "express";
import Joi from "joi";
import { resSender } from "../../../Services/responseService";
import { asyncHandler } from "../../../helpers/utils";
import { CustomRequest } from "../../../Types/CustomRequest";
import { ComPlatform } from "../../../Types/types";
import {
  ComPlatformClient,
  WhatsAppService,
  LinkedInService,
  TelegramService,
  DiscordService,
  SlackService,
} from "../Clients";
import { CommunityService } from "../Clients/CommunityService";
import { Community } from "../../../Models/CommunityModels";

export class CommunityController {
  private communityService: CommunityService;
  
  constructor() {
    this.communityService = new CommunityService();
  }
  
  // Platform Connection
  connectPlatform = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { error } = Joi.object({
      platform: Joi.string().required().valid(
        "facebook",
        "instagram",
        "linkedin",
        "whatsapp",
        "telegram",
        "discord",
        "slack"
      ),
    }).validate(req.params);
    
    if (error) return resSender(res, 400, "fail", error.details[0].message);

    const { platform } = req.params;
    const orgId = req.organizationId?._id;
    const userId = req.user?._id;

    if (!Object.values(ComPlatform).includes(platform as ComPlatform)) {
      return resSender(res, 400, "fail", "Invalid platform");
    }

    try {
      const result = await this.communityService.initiatePlatformConnection(
        platform as ComPlatform,
        orgId as string,
        userId as string
      );
      
      return resSender(
        res,
        200,
        "success",
        "Connection initiated",
        null,
        result
      );
    } catch (error: any) {
      console.error("Error connecting platform:", error);
      return resSender(
        res,
        500,
        "error",
        error.message || "Error occurred while connecting to platform."
      );
    }
  });
  
  // Get connected platforms
  getConnectedPlatforms = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const orgId = req.organizationId?._id;
      
      const connections = await this.communityService.getPlatformConnections(orgId as string);
      
      return resSender(
        res,
        200,
        "success",
        "Platform connections retrieved",
        null,
        connections
      );
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occured");
    }
  });
  
  // Disconnect platform
  disconnectPlatform = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const { error } = Joi.object({
        connectionId: Joi.string().required(),
      }).validate(req.params);
      
      if (error) return resSender(res, 400, "fail", error.details[0].message);
      
      const { connectionId } = req.params;
      const orgId = req.organizationId?._id;
      
      await this.communityService.disconnectPlatform(connectionId, orgId as string);
      
      return resSender(
        res,
        200,
        "success",
        "Platform disconnected successfully"
      );
    } catch (error: any) {
      return resSender(res, 500, 'error', error.message || 'Error occured')
    }
  });
  
  // Get communities
  getCommunities = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const { platform } = req.query;
      const orgId = req.organizationId?._id;
      
      const communities = await this.communityService.getCommunities(
        orgId as string,
        platform as ComPlatform
      );
      
      return resSender(
        res,
        200,
        "success",
        "Communities retrieved",
        null,
        communities
      );
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occured");
    }
  });
  
  // Sync communities
  syncCommunities = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const { error } = Joi.object({
        platform: Joi.string().required().valid(
          "facebook",
          "instagram",
          "linkedin",
          "whatsapp",
          "telegram",
          "discord",
          "slack"
        ),
      }).validate(req.body);
      
      if (error) return resSender(res, 400, "fail", error.details[0].message);
      
      const { platform } = req.body;
      const orgId = req.organizationId?._id;
      
      const communities = await this.communityService.syncCommunities(
        orgId as string,
        platform as ComPlatform
      );

      // for (let index = 0; index < communities.length; index++) {
      //   const community = communities[index];
      //   let newComm = new Community({ ...community, orgId });
      //   await newComm.save();        
      // }
      
      return resSender(
        res,
        200,
        "success",
        "Communities synced successfully",
        null,
        communities
      );
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occured");
    }
  });
  
  // Get community details
  getCommunityDetails = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const { error } = Joi.object({
        communityId: Joi.string().required(),
      }).validate(req.params);
      
      if (error) return resSender(res, 400, "fail", error.details[0].message);
      
      const { communityId } = req.params;
      const orgId = req.organizationId?._id;
      
      const community = await this.communityService.getCommunityDetails(
        communityId,
        orgId as string
      );
      
      return resSender(
        res,
        200,
        "success",
        "Community details retrieved",
        null,
        community,
      );
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occured");
    }
  });
  
  // Create post
  createPost = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const schema = Joi.object({
        communityId: Joi.string().required(),
        content: Joi.object({
          text: Joi.string().allow(''),
          media: Joi.array().items(
            Joi.object({
              url: Joi.string().required(),
              type: Joi.string().valid('image', 'video', 'document', 'audio', 'link').required(),
              thumbnail: Joi.string(),
              size: Joi.number(),
              duration: Joi.number(),
              name: Joi.string()
            })
          ),
          link: Joi.string().allow(''),
          linkPreview: Joi.object({
            title: Joi.string(),
            description: Joi.string(),
            image: Joi.string(),
            url: Joi.string().required()
          })
        }).required(),
        scheduledAt: Joi.date().optional()
      });
      
      const { error } = schema.validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);
      
      const { communityId, content, scheduledAt } = req.body;
      const orgId = req.organizationId?._id;
      const userId = req.user?._id;
      
      const result = await this.communityService.createPost(
        communityId,
        content,
        scheduledAt,
        orgId as string,
        userId as string
      );
      
      return resSender(
        res,
        200,
        "success",
        scheduledAt ? "Post scheduled successfully" : "Post created successfully",
        result
      );
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occured");
    }
  });
  
  // Get posts
  getPosts = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const { communityId, status, page = 1, limit = 20 } = req.query;
      const orgId = req.organizationId?._id;
      
      const posts = await this.communityService.getPosts(
        orgId as string,
        communityId as string,
        status as string,
        parseInt(page as string),
        parseInt(limit as string)
      );
      
      return resSender(res, 200, "success", "Posts retrieved", null, posts);
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occured");
    }
  });
  
  // Update post
  updatePost = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const schema = Joi.object({
        content: Joi.object({
          text: Joi.string().allow(''),
          media: Joi.array().items(
            Joi.object({
              url: Joi.string().required(),
              type: Joi.string().valid('image', 'video', 'document', 'audio', 'link').required(),
              thumbnail: Joi.string(),
              size: Joi.number(),
              duration: Joi.number(),
              name: Joi.string()
            })
          ),
          link: Joi.string().allow(''),
          linkPreview: Joi.object({
            title: Joi.string(),
            description: Joi.string(),
            image: Joi.string(),
            url: Joi.string().required()
          })
        }).optional(),
        status: Joi.string().valid('draft', 'scheduled', 'posted', 'failed', 'cancelled').optional(),
        scheduledAt: Joi.date().optional()
      });
      
      const { error } = schema.validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);
      
      const { postId } = req.params;
      const orgId = req.organizationId?._id;
      
      const result = await this.communityService.updatePost(
        postId,
        req.body,
        orgId as string
      );
      
      return resSender(
        res,
        200,
        "success",
        "Post updated successfully",
        result
      );
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occured");
    }
  });
  
  // Delete post
  deletePost = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const { error } = Joi.object({
        postId: Joi.string().required(),
      }).validate(req.params);
      
      if (error) return resSender(res, 400, "fail", error.details[0].message);
      
      const { postId } = req.params;
      const orgId = req.organizationId?._id;
      
      await this.communityService.deletePost(postId, orgId as string);
      
      return resSender(
        res,
        200,
        "success",
        "Post deleted successfully"
      );
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occured");
    }
  });
  
  // Get community members
  getCommunityMembers = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const { communityId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const orgId = req.organizationId?._id;
      
      const members = await this.communityService.getCommunityMembers(
        communityId,
        orgId as string,
        parseInt(page as string),
        parseInt(limit as string)
      );
      
      return resSender(
        res,
        200,
        "success",
        "Community members retrieved",
        null,
        members,
      );
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occured");
    }
  });
  
  // WhatsApp-specific endpoints
  sendWhatsAppMessage = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const schema = Joi.object({
        phoneNumber: Joi.string().required(),
        message: Joi.object({
          type: Joi.string().valid('text', 'media', 'template').required(),
          text: Joi.string().when('type', { is: 'text', then: Joi.required() }),
          media: Joi.object().when('type', { is: 'media', then: Joi.required() }),
          template: Joi.object().when('type', { is: 'template', then: Joi.required() })
        }).required()
      });
      
      const { error } = schema.validate(req.body);
      if (error) return resSender(res, 400, "fail", error.details[0].message);
      
      const { phoneNumber, message } = req.body;
      const orgId = req.organizationId?._id;
      
      const result = await this.communityService.sendWhatsAppMessage(
        orgId as string,
        phoneNumber,
        message
      );
      
      return resSender(
        res,
        200,
        "success",
        "WhatsApp message sent",
        result
      );
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occured");
    }
  });
  
  getWhatsAppBusinessProfile = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const { connectionId } = req.params;
      const orgId = req.organizationId?._id;
      
      const profile = await this.communityService.getWhatsAppBusinessProfile(
        connectionId,
        orgId as string
      );
      
      return resSender(
        res,
        200,
        "success",
        "WhatsApp business profile retrieved",
        profile
      );
    } catch (error: any) {
      return resSender(res, 500, "error", error.message || "Error occured");
    }
  });
  
  // Webhook verification for WhatsApp
  verifyWhatsAppWebhook = asyncHandler(async (req: Request, res: Response) => {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
    
    if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_TOKEN) {
      return res.status(200).send(challenge);
    }
    
    return resSender(res, 403, "fail", "Verification failed");
  });
  
  // Webhook handler for WhatsApp
  handleWhatsAppWebhook = asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log('WhatsApp webhook received:', req.body);
      
      // Verify webhook signature
      const signature = req.headers['x-hub-signature-256'] as string;
      if (signature) {
        // Implement signature verification here
        // const expectedSignature = crypto.createHmac('sha256', process.env.WHATSAPP_APP_SECRET).update(JSON.stringify(req.body)).digest('hex');
        // if (`sha256=${expectedSignature}` !== signature) {
        //   return resSender(res, 403, "fail", "Invalid signature");
        // }
      }
      
      // Handle the webhook
      await this.communityService.handleWhatsAppWebhook(req.body);
      
      return resSender(res, 200, "success", "Webhook processed");
    } catch (error) {
      console.log('Error: ', error);
    }
  });
}

export const communityController = new CommunityController();