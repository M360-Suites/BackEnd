import axios from "axios";
import { PostContent, PostResult } from "../../../Types/types";
import { BasePoster } from "./basePoster";
import { uploadFile } from "../../../Services/mediaService";

export class FacebookPoster extends BasePoster {
  async post(content: PostContent): Promise<PostResult> {
    try {
      const accessToken = this.getAccessToken();

      // Get user's pages
      const pagesResponse = await axios.get(
        `https://graph.facebook.com/me/accounts?access_token=${accessToken}`
      );

      if (!pagesResponse.data.data.length) {
        return this.createResult(false, undefined, "No Facebook pages found");
      }

      // console.log("Pages: ", JSON.stringify(pagesResponse.data, null, 2));

      const pageAccessToken = pagesResponse.data.data[0].access_token;
      const pageId = pagesResponse.data.data[0].id;

      // Handle multiple files
      const files = Array.isArray(content.files)
        ? content.files
        : content.file
        ? [content.file]
        : [];

      if (files.length === 0 && !content.text) {
        return this.createResult(false, undefined, "No content to post");
      }

      // Upload all media files first
      const mediaUrls: string[] = [];
      for (const file of files) {
        const mediaRes = await uploadFile(file.path, {
          folder: "social-media",
          resource_type: "auto",
        });
        mediaUrls.push(mediaRes.secure_url);
      }

      // Create post based on media type
      let postId: string;
      if (mediaUrls.length > 0) {
        if (
          mediaUrls.some(
            (url) =>
              url.includes(".mp4") ||
              mediaUrls.some((url) => url.includes(".mov"))
          )
        ) {
          // Video post - Facebook only supports one video per post
          const videoUrl = mediaUrls.find(
            (url) => url.includes(".mp4") || url.includes(".mov")
          );
          const response = await axios.post(
            `https://graph.facebook.com/${pageId}/videos`,
            {
              access_token: pageAccessToken,
              file_url: videoUrl,
              description: content.text,
              published: true,
            }
          );
          postId = response.data.id;
        } else {
          // Image post - can be multiple
          if (mediaUrls.length > 1) {
            // Create album for multiple images
            const albumRes = await axios.post(
              `https://graph.facebook.com/${pageId}/albums`,
              {
                access_token: pageAccessToken,
                name: content.text || "New Album",
                message: content.description || "",
              }
            );

            // Add photos to album
            for (const url of mediaUrls) {
              await axios.post(
                `https://graph.facebook.com/${albumRes.data.id}/photos`,
                {
                  access_token: pageAccessToken,
                  url: url,
                  published: true,
                }
              );
            }
            postId = albumRes.data.id;
          } else {
            // Single image post
            const response = await axios.post(
              `https://graph.facebook.com/${pageId}/photos`,
              {
                access_token: pageAccessToken,
                url: mediaUrls[0],
                caption: content.text,
                published: true,
              }
            );
            postId = response.data.id;
          }
        }
      } else {
        // Text-only post
        const response = await axios.post(
          `https://graph.facebook.com/${pageId}/feed`,
          {
            access_token: pageAccessToken,
            message: content.text,
          }
        );
        postId = response.data.id;
      }

      return this.createResult(true, postId);
    } catch (error: any) {
      return this.createResult(
        false,
        undefined,
        error.response?.data?.error?.message || error.message
      );
    }
  }
}
