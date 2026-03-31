import { ComPlatformClient } from './ComPlatformClient';
import { 
  ComConInterface, 
  CommunityInterface, 
  CommunityPostInterface, 
  CommunityMember,
  ComPlatform,
  CommunityType,
  CommunityPermission,
  PostStatusCM
} from '../../../Types/types';
import { Community, CommunityConnection, CommunityPost } from '../../../Models/CommunityModels';
import comOauth from '../Auth/oauth';
import axios from 'axios';

export class LinkedInService extends ComPlatformClient {
  constructor() {
    super(ComPlatform.LINKEDIN);
  }
  
  async connectAccount(userId: string, authCode: string, state?: string): Promise<ComConInterface> {
    if (!state) {
      throw new Error('State parameter is required for LinkedIn OAuth');
    }
    
    const connection = await comOauth.handleCallback(authCode, state);
    return connection;
  }
  
  async disconnectAccount(connectionId: string): Promise<void> {
    const connection = await CommunityConnection.findById(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }
    
    await comOauth.revokeConnection(connection);
  }
  
  async fetchCommunities(connection: ComConInterface): Promise<CommunityInterface[]> {
    const accessToken = this.getAccessToken(connection);
    
    try {
      const communities: CommunityInterface[] = [];
      
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
          const community = await Community.findOneAndUpdate(
            {
              orgId: connection.orgId,
              platform: ComPlatform.LINKEDIN,
              platformCommunityId: org.id
            },
            {
              userId: connection.userId,
              orgId: connection.orgId,
              platform: ComPlatform.LINKEDIN,
              platformCommunityId: org.id,
              name: org.localizedName,
              avatar: org.logoV2?.original?.url,
              type: CommunityType.PAGE,
              permissions: [CommunityPermission.ADMIN, CommunityPermission.WRITE],
              metadata: {
                vanityName: org.vanityName,
                logo: org.logoV2
              },
              isActive: true,
              lastSyncedAt: new Date()
            },
            { upsert: true, new: true }
          );
          
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
          
          const community = await Community.findOneAndUpdate(
            {
              orgId: connection.orgId,
              platform: ComPlatform.LINKEDIN,
              platformCommunityId: groupResponse.id
            },
            {
              userId: connection.userId,
              orgId: connection.orgId,
              platform: ComPlatform.LINKEDIN,
              platformCommunityId: groupResponse.id,
              name: groupResponse.name,
              description: groupResponse.description,
              type: CommunityType.GROUP,
              memberCount: groupResponse.numMembers,
              permissions: [CommunityPermission.ADMIN],
              metadata: {
                entityUrn: groupResponse.entityUrn,
                siteGroupUrl: groupResponse.siteGroupUrl
              },
              isActive: true,
              lastSyncedAt: new Date()
            },
            { upsert: true, new: true }
          );
          
          communities.push(community);
        }
      } catch (groupsError: any) {
        console.log('Error fetching LinkedIn groups:', groupsError.message);
      }
      
      return communities;
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.LINKEDIN);
    }
  }
  
  async getCommunityDetails(connection: ComConInterface, communityId: string): Promise<CommunityInterface> {
    const community = await Community.findOne({
      _id: communityId,
      platform: ComPlatform.LINKEDIN,
      orgId: connection.orgId
    });
    
    if (!community) {
      throw new Error('Community not found');
    }
    
    return community;
  }
  
  async createPost(connection: ComConInterface, communityId: string, postData: CommunityPostInterface): Promise<any> {
    const community = await this.getCommunityDetails(connection, communityId);
    const accessToken = this.getAccessToken(connection);
    
    try {
      let endpoint: string;
      let data: any;
      
      if (community.type === CommunityType.PAGE) {
        // Post to LinkedIn Page
        endpoint = `https://api.linkedin.com/v2/shares`;
        
        const shareContent = {
          content: {
            contentEntities: [] as any[]
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
            await axios.put(registerResponse.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl, 
              media.url, {
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
      } else if (community.type === CommunityType.GROUP) {
        // Post to LinkedIn Group
        endpoint = `https://api.linkedin.com/v2/groups/${community.platformCommunityId}/posts`;
        data = {
          commentary: postData.content.text,
          visibility: 'PUBLIC'
        };
      } else {
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
      const post = await CommunityPost.create({
        communityId: community._id,
        platform: ComPlatform.LINKEDIN,
        platformPostId: response.id,
        content: postData.content,
        status: PostStatusCM.POSTED,
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
    } catch (error: any) {
      // Save failed post
      await CommunityPost.create({
        communityId: community._id,
        platform: ComPlatform.LINKEDIN,
        content: postData.content,
        status: PostStatusCM.FAILED,
        error: error.message,
        createdBy: connection.userId
      });
      
      this.handlePlatformError(error, ComPlatform.LINKEDIN);
    }
  }
  
  async updatePost(connection: ComConInterface, postId: string, postData: Partial<CommunityPostInterface>): Promise<any> {
    // LinkedIn doesn't support updating posts via API
    // We can only update the local record
    const post = await CommunityPost.findOneAndUpdate(
      {
        _id: postId,
        platform: ComPlatform.LINKEDIN
      },
      {
        content: postData.content,
        status: postData.status,
        error: postData.error
      },
      { new: true }
    );
    
    if (!post) {
      throw new Error('Post not found');
    }
    
    return post;
  }
  
  async deletePost(connection: ComConInterface, postId: string): Promise<any> {
    const post = await CommunityPost.findById(postId);
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
      await CommunityPost.findByIdAndDelete(postId);
      
      return { success: true, message: 'Post deleted successfully' };
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.LINKEDIN);
    }
  }
  
  async schedulePost(connection: ComConInterface, communityId: string, postData: CommunityPostInterface, scheduleTime: Date): Promise<any> {
    const community = await this.getCommunityDetails(connection, communityId);
    
    // Create scheduled post
    const post = await CommunityPost.create({
      communityId: community._id,
      platform: ComPlatform.LINKEDIN,
      content: postData.content,
      scheduledAt: scheduleTime,
      status: PostStatusCM.SCHEDULED,
      createdBy: connection.userId
    });
    
    return {
      success: true,
      postId: post._id,
      scheduledAt: scheduleTime
    };
  }
  
  async fetchMembers(connection: ComConInterface, communityId: string, limit: number = 100, offset: number = 0): Promise<CommunityMember[]> {
    const community = await this.getCommunityDetails(connection, communityId);
    
    if (community.type !== CommunityType.GROUP) {
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
      
      return (response.elements || []).map((member: any) => ({
        memberId: member.personUrn.split(':').pop(),
        name: member.name,
        role: member.role === 'ADMINISTRATOR' ? CommunityPermission.ADMIN : CommunityPermission.MEMBER,
        joinedAt: new Date() // LinkedIn doesn't provide join date
      }));
    } catch (error: any) {
      console.error('Error fetching LinkedIn members:', error.message);
      return [];
    }
  }
  
  async removeMember(connection: ComConInterface, communityId: string, memberId: string): Promise<any> {
    const community = await this.getCommunityDetails(connection, communityId);
    
    if (community.type !== CommunityType.GROUP) {
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
    } catch (error: any) {
      this.handlePlatformError(error, ComPlatform.LINKEDIN);
    }
  }
  
  async sendMessage(connection: ComConInterface, to: string, message: any, options?: any): Promise<any> {
    // LinkedIn messaging is limited and requires specific permissions
    throw new Error('LinkedIn messaging API is limited and requires specific permissions');
  }
  
  async refreshToken(connection: ComConInterface): Promise<ComConInterface> {
    return await comOauth.refreshToken(connection);
  }
}