"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkedInService = void 0;
const ComPlatformClient_1 = require("./ComPlatformClient");
const types_1 = require("../../../Types/types");
const CommunityModels_1 = require("../../../Models/CommunityModels");
const oauth_1 = __importDefault(require("../Auth/oauth"));
const axios_1 = __importDefault(require("axios"));
class LinkedInService extends ComPlatformClient_1.ComPlatformClient {
    constructor() {
        super(types_1.ComPlatform.LINKEDIN);
    }
    async connectAccount(userId, authCode, state) {
        if (!state) {
            throw new Error('State parameter is required for LinkedIn OAuth');
        }
        const connection = await oauth_1.default.handleCallback(authCode, state);
        return connection;
    }
    async disconnectAccount(connectionId) {
        const connection = await CommunityModels_1.CommunityConnection.findById(connectionId);
        if (!connection) {
            throw new Error('Connection not found');
        }
        await oauth_1.default.revokeConnection(connection);
    }
    async fetchCommunities(connection) {
        const accessToken = this.getAccessToken(connection);
        try {
            const communities = [];
            // Fetch LinkedIn Pages (organizations)
            const pagesResponse = await this.makeApiRequest({
                method: 'GET',
                url: 'https://api.linkedin.com/v2/organizationalEntityAcls',
                headers: { Authorization: `Bearer ${accessToken}` },
                params: {
                    q: 'roleAssignee',
                    role: 'ADMINISTRATOR',
                    state: 'APPROVED',
                    projection: '(elements*(organizationalTarget~(id,localizedName,vanityName,logoV2)))'
                }
            });
            for (const element of pagesResponse.elements || []) {
                const org = element['organizationalTarget~'];
                if (org) {
                    const community = await CommunityModels_1.Community.findOneAndUpdate({
                        orgId: connection.orgId,
                        platform: types_1.ComPlatform.LINKEDIN,
                        platformCommunityId: org.id
                    }, {
                        userId: connection.userId,
                        orgId: connection.orgId,
                        platform: types_1.ComPlatform.LINKEDIN,
                        platformCommunityId: org.id,
                        name: org.localizedName,
                        avatar: org.logoV2?.original?.url,
                        type: types_1.CommunityType.PAGE,
                        permissions: [types_1.CommunityPermission.ADMIN, types_1.CommunityPermission.WRITE],
                        metadata: {
                            vanityName: org.vanityName,
                            logo: org.logoV2
                        },
                        isActive: true,
                        lastSyncedAt: new Date()
                    }, { upsert: true, new: true });
                    communities.push(community);
                }
            }
            // Fetch LinkedIn Groups
            try {
                const groupsResponse = await this.makeApiRequest({
                    method: 'GET',
                    url: 'https://api.linkedin.com/v2/groups',
                    headers: { Authorization: `Bearer ${accessToken}` },
                    params: {
                        q: 'role',
                        role: 'ADMINISTRATOR',
                        count: 100
                    }
                });
                for (const element of groupsResponse.elements || []) {
                    // Need to fetch group details
                    const groupResponse = await this.makeApiRequest({
                        method: 'GET',
                        url: `https://api.linkedin.com/v2/groups/${element.entityUrn.split(':').pop()}`,
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    const community = await CommunityModels_1.Community.findOneAndUpdate({
                        orgId: connection.orgId,
                        platform: types_1.ComPlatform.LINKEDIN,
                        platformCommunityId: groupResponse.id
                    }, {
                        userId: connection.userId,
                        orgId: connection.orgId,
                        platform: types_1.ComPlatform.LINKEDIN,
                        platformCommunityId: groupResponse.id,
                        name: groupResponse.name,
                        description: groupResponse.description,
                        type: types_1.CommunityType.GROUP,
                        memberCount: groupResponse.numMembers,
                        permissions: [types_1.CommunityPermission.ADMIN],
                        metadata: {
                            entityUrn: groupResponse.entityUrn,
                            siteGroupUrl: groupResponse.siteGroupUrl
                        },
                        isActive: true,
                        lastSyncedAt: new Date()
                    }, { upsert: true, new: true });
                    communities.push(community);
                }
            }
            catch (groupsError) {
                console.log('Error fetching LinkedIn groups:', groupsError.message);
            }
            return communities;
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.LINKEDIN);
        }
    }
    async getCommunityDetails(connection, communityId) {
        const community = await CommunityModels_1.Community.findOne({
            _id: communityId,
            platform: types_1.ComPlatform.LINKEDIN,
            orgId: connection.orgId
        });
        if (!community) {
            throw new Error('Community not found');
        }
        return community;
    }
    async createPost(connection, communityId, postData) {
        const community = await this.getCommunityDetails(connection, communityId);
        const accessToken = this.getAccessToken(connection);
        try {
            let endpoint;
            let data;
            if (community.type === types_1.CommunityType.PAGE) {
                // Post to LinkedIn Page
                endpoint = `https://api.linkedin.com/v2/shares`;
                const shareContent = {
                    content: {
                        contentEntities: []
                    },
                    owner: `urn:li:organization:${community.platformCommunityId}`,
                    subject: postData.content.text?.substring(0, 200),
                    text: {
                        text: postData.content.text || ''
                    }
                };
                // Add media if present
                if (postData.content.media && postData.content.media.length > 0) {
                    for (const media of postData.content.media) {
                        // First register the image
                        const registerResponse = await this.makeApiRequest({
                            method: 'POST',
                            url: 'https://api.linkedin.com/v2/assets?action=registerUpload',
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                                'Content-Type': 'application/json'
                            },
                            data: {
                                registerUploadRequest: {
                                    owner: `urn:li:organization:${community.platformCommunityId}`,
                                    recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                                    serviceRelationships: [{
                                            relationshipType: 'OWNER',
                                            identifier: 'urn:li:userGeneratedContent'
                                        }]
                                }
                            }
                        });
                        // Then upload the image
                        await axios_1.default.put(registerResponse.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl, media.url, {
                            headers: {
                                'Content-Type': 'image/jpeg'
                            }
                        });
                        shareContent.content.contentEntities.push({
                            entityLocation: registerResponse.value.asset,
                            thumbnails: []
                        });
                    }
                }
                data = shareContent;
            }
            else if (community.type === types_1.CommunityType.GROUP) {
                // Post to LinkedIn Group
                endpoint = `https://api.linkedin.com/v2/groups/${community.platformCommunityId}/posts`;
                data = {
                    commentary: postData.content.text,
                    visibility: 'PUBLIC'
                };
            }
            else {
                throw new Error('Unsupported community type');
            }
            const response = await this.makeApiRequest({
                method: 'POST',
                url: endpoint,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0'
                },
                data
            });
            // Save the post
            const post = await CommunityModels_1.CommunityPost.create({
                communityId: community._id,
                platform: types_1.ComPlatform.LINKEDIN,
                platformPostId: response.id,
                content: postData.content,
                status: types_1.PostStatusCM.POSTED,
                postedAt: new Date(),
                createdBy: connection.userId,
                metadata: {
                    linkedinPostId: response.id,
                    ...response
                }
            });
            return {
                success: true,
                postId: response.id,
                localPostId: post._id
            };
        }
        catch (error) {
            // Save failed post
            await CommunityModels_1.CommunityPost.create({
                communityId: community._id,
                platform: types_1.ComPlatform.LINKEDIN,
                content: postData.content,
                status: types_1.PostStatusCM.FAILED,
                error: error.message,
                createdBy: connection.userId
            });
            this.handlePlatformError(error, types_1.ComPlatform.LINKEDIN);
        }
    }
    async updatePost(connection, postId, postData) {
        // LinkedIn doesn't support updating posts via API
        // We can only update the local record
        const post = await CommunityModels_1.CommunityPost.findOneAndUpdate({
            _id: postId,
            platform: types_1.ComPlatform.LINKEDIN
        }, {
            content: postData.content,
            status: postData.status,
            error: postData.error
        }, { new: true });
        if (!post) {
            throw new Error('Post not found');
        }
        return post;
    }
    async deletePost(connection, postId) {
        const post = await CommunityModels_1.CommunityPost.findById(postId);
        if (!post) {
            throw new Error('Post not found');
        }
        if (!post.platformPostId) {
            throw new Error('Platform post ID not found');
        }
        const accessToken = this.getAccessToken(connection);
        try {
            await this.makeApiRequest({
                method: 'DELETE',
                url: `https://api.linkedin.com/v2/shares/${post.platformPostId}`,
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            // Delete from local database
            await CommunityModels_1.CommunityPost.findByIdAndDelete(postId);
            return { success: true, message: 'Post deleted successfully' };
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.LINKEDIN);
        }
    }
    async schedulePost(connection, communityId, postData, scheduleTime) {
        const community = await this.getCommunityDetails(connection, communityId);
        // Create scheduled post
        const post = await CommunityModels_1.CommunityPost.create({
            communityId: community._id,
            platform: types_1.ComPlatform.LINKEDIN,
            content: postData.content,
            scheduledAt: scheduleTime,
            status: types_1.PostStatusCM.SCHEDULED,
            createdBy: connection.userId
        });
        return {
            success: true,
            postId: post._id,
            scheduledAt: scheduleTime
        };
    }
    async fetchMembers(connection, communityId, limit = 100, offset = 0) {
        const community = await this.getCommunityDetails(connection, communityId);
        if (community.type !== types_1.CommunityType.GROUP) {
            // LinkedIn Pages don't have member lists
            return [];
        }
        const accessToken = this.getAccessToken(connection);
        try {
            const response = await this.makeApiRequest({
                method: 'GET',
                url: `https://api.linkedin.com/v2/groups/${community.platformCommunityId}/members`,
                headers: { Authorization: `Bearer ${accessToken}` },
                params: {
                    start: offset,
                    count: limit
                }
            });
            return (response.elements || []).map((member) => ({
                memberId: member.personUrn.split(':').pop(),
                name: member.name,
                role: member.role === 'ADMINISTRATOR' ? types_1.CommunityPermission.ADMIN : types_1.CommunityPermission.MEMBER,
                joinedAt: new Date() // LinkedIn doesn't provide join date
            }));
        }
        catch (error) {
            console.error('Error fetching LinkedIn members:', error.message);
            return [];
        }
    }
    async removeMember(connection, communityId, memberId) {
        const community = await this.getCommunityDetails(connection, communityId);
        if (community.type !== types_1.CommunityType.GROUP) {
            throw new Error('Can only remove members from groups');
        }
        const accessToken = this.getAccessToken(connection);
        try {
            await this.makeApiRequest({
                method: 'DELETE',
                url: `https://api.linkedin.com/v2/groups/${community.platformCommunityId}/members/urn:li:person:${memberId}`,
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            return { success: true, message: 'Member removed successfully' };
        }
        catch (error) {
            this.handlePlatformError(error, types_1.ComPlatform.LINKEDIN);
        }
    }
    async sendMessage(connection, to, message, options) {
        // LinkedIn messaging is limited and requires specific permissions
        throw new Error('LinkedIn messaging API is limited and requires specific permissions');
    }
    async refreshToken(connection) {
        return await oauth_1.default.refreshToken(connection);
    }
}
exports.LinkedInService = LinkedInService;
