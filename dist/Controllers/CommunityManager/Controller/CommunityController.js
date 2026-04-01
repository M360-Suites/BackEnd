"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityController = exports.CommunityController = void 0;
const joi_1 = __importDefault(require("joi"));
const responseService_1 = require("../../../Services/responseService");
const utils_1 = require("../../../helpers/utils");
const types_1 = require("../../../Types/types");
const CommunityService_1 = require("../Clients/CommunityService");
class CommunityController {
    constructor() {
        // Platform Connection
        this.connectPlatform = (0, utils_1.asyncHandler)(async (req, res) => {
            const { error } = joi_1.default.object({
                platform: joi_1.default.string().required().valid("facebook", "instagram", "linkedin", "whatsapp", "telegram", "discord", "slack"),
            }).validate(req.params);
            if (error)
                return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
            const { platform } = req.params;
            const orgId = req.organizationId?._id;
            const userId = req.user?._id;
            if (!Object.values(types_1.ComPlatform).includes(platform)) {
                return (0, responseService_1.resSender)(res, 400, "fail", "Invalid platform");
            }
            try {
                const result = await this.communityService.initiatePlatformConnection(platform, orgId, userId);
                return (0, responseService_1.resSender)(res, 200, "success", "Connection initiated", null, result);
            }
            catch (error) {
                console.error("Error connecting platform:", error);
                return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occurred while connecting to platform.");
            }
        });
        // Get connected platforms
        this.getConnectedPlatforms = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                const orgId = req.organizationId?._id;
                const connections = await this.communityService.getPlatformConnections(orgId);
                return (0, responseService_1.resSender)(res, 200, "success", "Platform connections retrieved", null, connections);
            }
            catch (error) {
                return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occured");
            }
        });
        // Disconnect platform
        this.disconnectPlatform = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                const { error } = joi_1.default.object({
                    connectionId: joi_1.default.string().required(),
                }).validate(req.params);
                if (error)
                    return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
                const { connectionId } = req.params;
                const orgId = req.organizationId?._id;
                await this.communityService.disconnectPlatform(connectionId, orgId);
                return (0, responseService_1.resSender)(res, 200, "success", "Platform disconnected successfully");
            }
            catch (error) {
                return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Error occured');
            }
        });
        // Get communities
        this.getCommunities = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                const { platform } = req.query;
                const orgId = req.organizationId?._id;
                const communities = await this.communityService.getCommunities(orgId, platform);
                return (0, responseService_1.resSender)(res, 200, "success", "Communities retrieved", null, communities);
            }
            catch (error) {
                return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occured");
            }
        });
        // Sync communities
        this.syncCommunities = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                const { error } = joi_1.default.object({
                    platform: joi_1.default.string().required().valid("facebook", "instagram", "linkedin", "whatsapp", "telegram", "discord", "slack"),
                }).validate(req.body);
                if (error)
                    return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
                const { platform } = req.body;
                const orgId = req.organizationId?._id;
                const communities = await this.communityService.syncCommunities(orgId, platform);
                // for (let index = 0; index < communities.length; index++) {
                //   const community = communities[index];
                //   let newComm = new Community({ ...community, orgId });
                //   await newComm.save();        
                // }
                return (0, responseService_1.resSender)(res, 200, "success", "Communities synced successfully", null, communities);
            }
            catch (error) {
                return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occured");
            }
        });
        // Get community details
        this.getCommunityDetails = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                const { error } = joi_1.default.object({
                    communityId: joi_1.default.string().required(),
                }).validate(req.params);
                if (error)
                    return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
                const { communityId } = req.params;
                const orgId = req.organizationId?._id;
                const community = await this.communityService.getCommunityDetails(communityId, orgId);
                return (0, responseService_1.resSender)(res, 200, "success", "Community details retrieved", null, community);
            }
            catch (error) {
                return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occured");
            }
        });
        // Create post
        this.createPost = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                const schema = joi_1.default.object({
                    communityId: joi_1.default.string().required(),
                    content: joi_1.default.object({
                        text: joi_1.default.string().allow(''),
                        media: joi_1.default.array().items(joi_1.default.object({
                            url: joi_1.default.string().required(),
                            type: joi_1.default.string().valid('image', 'video', 'document', 'audio', 'link').required(),
                            thumbnail: joi_1.default.string(),
                            size: joi_1.default.number(),
                            duration: joi_1.default.number(),
                            name: joi_1.default.string()
                        })),
                        link: joi_1.default.string().allow(''),
                        linkPreview: joi_1.default.object({
                            title: joi_1.default.string(),
                            description: joi_1.default.string(),
                            image: joi_1.default.string(),
                            url: joi_1.default.string().required()
                        })
                    }).required(),
                    scheduledAt: joi_1.default.date().optional()
                });
                const { error } = schema.validate(req.body);
                if (error)
                    return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
                const { communityId, content, scheduledAt } = req.body;
                const orgId = req.organizationId?._id;
                const userId = req.user?._id;
                const result = await this.communityService.createPost(communityId, content, scheduledAt, orgId, userId);
                return (0, responseService_1.resSender)(res, 200, "success", scheduledAt ? "Post scheduled successfully" : "Post created successfully", result);
            }
            catch (error) {
                return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occured");
            }
        });
        // Get posts
        this.getPosts = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                const { communityId, status, page = 1, limit = 20 } = req.query;
                const orgId = req.organizationId?._id;
                const posts = await this.communityService.getPosts(orgId, communityId, status, parseInt(page), parseInt(limit));
                return (0, responseService_1.resSender)(res, 200, "success", "Posts retrieved", null, posts);
            }
            catch (error) {
                return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occured");
            }
        });
        // Update post
        this.updatePost = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                const schema = joi_1.default.object({
                    content: joi_1.default.object({
                        text: joi_1.default.string().allow(''),
                        media: joi_1.default.array().items(joi_1.default.object({
                            url: joi_1.default.string().required(),
                            type: joi_1.default.string().valid('image', 'video', 'document', 'audio', 'link').required(),
                            thumbnail: joi_1.default.string(),
                            size: joi_1.default.number(),
                            duration: joi_1.default.number(),
                            name: joi_1.default.string()
                        })),
                        link: joi_1.default.string().allow(''),
                        linkPreview: joi_1.default.object({
                            title: joi_1.default.string(),
                            description: joi_1.default.string(),
                            image: joi_1.default.string(),
                            url: joi_1.default.string().required()
                        })
                    }).optional(),
                    status: joi_1.default.string().valid('draft', 'scheduled', 'posted', 'failed', 'cancelled').optional(),
                    scheduledAt: joi_1.default.date().optional()
                });
                const { error } = schema.validate(req.body);
                if (error)
                    return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
                const { postId } = req.params;
                const orgId = req.organizationId?._id;
                const result = await this.communityService.updatePost(postId, req.body, orgId);
                return (0, responseService_1.resSender)(res, 200, "success", "Post updated successfully", result);
            }
            catch (error) {
                return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occured");
            }
        });
        // Delete post
        this.deletePost = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                const { error } = joi_1.default.object({
                    postId: joi_1.default.string().required(),
                }).validate(req.params);
                if (error)
                    return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
                const { postId } = req.params;
                const orgId = req.organizationId?._id;
                await this.communityService.deletePost(postId, orgId);
                return (0, responseService_1.resSender)(res, 200, "success", "Post deleted successfully");
            }
            catch (error) {
                return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occured");
            }
        });
        // Get community members
        this.getCommunityMembers = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                const { communityId } = req.params;
                const { page = 1, limit = 50 } = req.query;
                const orgId = req.organizationId?._id;
                const members = await this.communityService.getCommunityMembers(communityId, orgId, parseInt(page), parseInt(limit));
                return (0, responseService_1.resSender)(res, 200, "success", "Community members retrieved", null, members);
            }
            catch (error) {
                return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occured");
            }
        });
        // WhatsApp-specific endpoints
        this.sendWhatsAppMessage = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                const schema = joi_1.default.object({
                    phoneNumber: joi_1.default.string().required(),
                    message: joi_1.default.object({
                        type: joi_1.default.string().valid('text', 'media', 'template').required(),
                        text: joi_1.default.string().when('type', { is: 'text', then: joi_1.default.required() }),
                        media: joi_1.default.object().when('type', { is: 'media', then: joi_1.default.required() }),
                        template: joi_1.default.object().when('type', { is: 'template', then: joi_1.default.required() })
                    }).required()
                });
                const { error } = schema.validate(req.body);
                if (error)
                    return (0, responseService_1.resSender)(res, 400, "fail", error.details[0].message);
                const { phoneNumber, message } = req.body;
                const orgId = req.organizationId?._id;
                const result = await this.communityService.sendWhatsAppMessage(orgId, phoneNumber, message);
                return (0, responseService_1.resSender)(res, 200, "success", "WhatsApp message sent", result);
            }
            catch (error) {
                return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occured");
            }
        });
        this.getWhatsAppBusinessProfile = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                const { connectionId } = req.params;
                const orgId = req.organizationId?._id;
                const profile = await this.communityService.getWhatsAppBusinessProfile(connectionId, orgId);
                return (0, responseService_1.resSender)(res, 200, "success", "WhatsApp business profile retrieved", profile);
            }
            catch (error) {
                return (0, responseService_1.resSender)(res, 500, "error", error.message || "Error occured");
            }
        });
        // Webhook verification for WhatsApp
        this.verifyWhatsAppWebhook = (0, utils_1.asyncHandler)(async (req, res) => {
            const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
            if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_TOKEN) {
                return res.status(200).send(challenge);
            }
            return (0, responseService_1.resSender)(res, 403, "fail", "Verification failed");
        });
        // Webhook handler for WhatsApp
        this.handleWhatsAppWebhook = (0, utils_1.asyncHandler)(async (req, res) => {
            try {
                console.log('WhatsApp webhook received:', req.body);
                // Verify webhook signature
                const signature = req.headers['x-hub-signature-256'];
                if (signature) {
                    // Implement signature verification here
                    // const expectedSignature = crypto.createHmac('sha256', process.env.WHATSAPP_APP_SECRET).update(JSON.stringify(req.body)).digest('hex');
                    // if (`sha256=${expectedSignature}` !== signature) {
                    //   return resSender(res, 403, "fail", "Invalid signature");
                    // }
                }
                // Handle the webhook
                await this.communityService.handleWhatsAppWebhook(req.body);
                return (0, responseService_1.resSender)(res, 200, "success", "Webhook processed");
            }
            catch (error) {
                console.log('Error: ', error);
            }
        });
        this.communityService = new CommunityService_1.CommunityService();
    }
}
exports.CommunityController = CommunityController;
exports.communityController = new CommunityController();
