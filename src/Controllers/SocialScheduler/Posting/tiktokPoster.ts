import axios, { AxiosError } from "axios";
import { PostContent, PostResult } from "../../../Types/types";
import { BasePoster } from "./basePoster";
import * as fs from "fs";
import FormData from "form-data";

export class TikTokPoster extends BasePoster {
  private readonly MIN_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB minimum
  private readonly MAX_CHUNK_SIZE = 64 * 1024 * 1024; // 64MB maximum
  private readonly FINAL_CHUNK_MAX = 128 * 1024 * 1024; // 128MB max for final chunk
  private readonly DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB default

  async post(content: PostContent): Promise<PostResult> {
    try {
      console.log("Starting TikTok post process...");
      let accessToken = this.getAccessToken();

      if (!content.text && !content.files) {
        console.error("Validation failed: No content provided");
        return this.createResult(
          false,
          undefined,
          "TikTok posts require at least text or media content"
        );
      }

      // Step 1: Get creator info (MANDATORY per TikTok guidelines)
      console.log("Fetching creator info...");
      const creatorInfo = await this.getCreatorInfo(accessToken);
      // console.log("Creator info:", JSON.stringify(creatorInfo, null, 2));

      // if (!creatorInfo.can_post) {
      //   const msg = "Creator cannot post at this time (daily limit reached)";
      //   console.error(msg);
      //   return this.createResult(false, undefined, msg);
      // }

      if (content.files && content.files.length > 0) {
        const fileType = this.getFileType(content.files[0].path);
        const fileSize = content.files[0].size;

        console.log(`Processing ${fileType} file (${fileSize} bytes)...`);

        if (fileType === "video") {
          // Check video duration against creator limits
          if (creatorInfo.max_video_post_duration_sec) {
            const duration = await this.getVideoDuration(content.files[0].path);
            if (duration > creatorInfo.max_video_post_duration_sec) {
              const msg = `Video exceeds maximum duration of ${creatorInfo.max_video_post_duration_sec} seconds`;
              console.error(msg);
              return this.createResult(false, undefined, msg);
            }
          }

          return await this.handleVideoUpload(
            content,
            accessToken,
            fileSize,
            creatorInfo
          );
        } else if (fileType === "image") {
          return await this.handlePhotoPost(content, accessToken, creatorInfo);
        }
      }

      return this.createResult(false, undefined, "Unsupported media type");
    } catch (error: any) {
      console.error("TikTok post failed:");
      const errorDetails = this.getErrorDetails(error);
      return this.createResult(
        false,
        undefined,
        `TikTok post failed: ${errorDetails}`
      );
    }
  }

  private async getCreatorInfo(accessToken: string): Promise<any> {
    try {
      const response = await axios.post(
        "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json; charset=UTF-8",
          },
        }
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Failed to get creator info:");
      const errorDetails = this.getErrorDetails(error);
      throw new Error(
        errorDetails || "Could not verify creator posting permissions"
      );
    }
  }

  private async handleVideoUpload(
    content: PostContent,
    accessToken: string,
    fileSize: number,
    creatorInfo: any
  ): Promise<PostResult> {
    console.log("Starting video upload process...");
    const videoFile = content.files![0];
    const videoPath = videoFile.path;

    // Determine chunking strategy based on file size
    let chunkSize: number;
    let totalChunks: number;

    if (fileSize < this.MIN_CHUNK_SIZE) {
      console.log("File is small (<5MB), using single chunk upload");
      chunkSize = fileSize;
      totalChunks = 1;
    } else {
      console.log("File is large (≥5MB), using chunked upload");
      chunkSize = this.DEFAULT_CHUNK_SIZE;
      totalChunks = Math.floor(fileSize / chunkSize);

      if (fileSize % chunkSize > 0) {
        totalChunks += 1;
      }
    }

    console.log(`Upload strategy: ${totalChunks} chunks of ${chunkSize} bytes`);

    // Step 1: Initialize video upload
    console.log("Initializing video upload...");
    const initResponse = await axios.post(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        post_info: {
          title: content.text || "",
          // For unaudited apps, must use SELF_ONLY per guidelines
          privacy_level: "SELF_ONLY",
          disable_comment: true,
          disable_duet: true,
          disable_stitch: true,
          brand_content_toggle: false,
          brand_organic_toggle: false,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: fileSize,
          chunk_size: chunkSize,
          total_chunk_count: totalChunks,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Upload initialization successful");
    // console.log("Upload initialization response:", initResponse.data);
    const { publish_id: publishId, upload_url: uploadUrl } =
      initResponse.data.data;

    // Step 2: Upload video (either whole or in chunks)
    console.log("Starting file upload...");
    const fileStream = fs.createReadStream(videoPath, {
      highWaterMark: chunkSize,
    });
    let chunkIndex = 0;
    let bytesUploaded = 0;

    for await (const chunk of fileStream) {
      const isFinalChunk = chunkIndex === totalChunks - 1;
      const start = chunkIndex * chunkSize;
      const end = start + chunk.length - 1;

      console.log(
        `Uploading chunk ${
          chunkIndex + 1
        }/${totalChunks} (bytes ${start}-${end})`
      );

      const response = await axios.put(uploadUrl, chunk, {
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Content-Type": videoFile.mimetype,
        },
      });

      console.log(`Chunk upload status: ${response.status}`);
      if (response.status !== (isFinalChunk ? 201 : 206)) {
        throw new Error(
          `Unexpected status code ${response.status} during upload`
        );
      }

      bytesUploaded += chunk.length;
      chunkIndex++;
    }

    console.log("File upload complete...");
    return this.createResult(true, publishId);
  }

  private async handlePhotoPost(
    content: PostContent,
    accessToken: string,
    creatorInfo: any
  ): Promise<PostResult> {
    // We'll disable image posting on tiktok till we have our dedicated url for pulling images.
    return this.createResult(false, '', 'Image posting on tiktok not currently available.');


    console.log("Starting photo post process...");

    // First upload images to a publicly accessible URL
    let imageUrls: string[] = [
      "https://m360-frontend.vercel.app/golden_2.jpeg",
      "https://m360-frontend.vercel.app/golden.jpeg",
    ]; // = await this.uploadImagesToServer(content.files!);
    // console.log("Image URLs:", imageUrls);

    // Then create the photo post
    console.log("Creating photo post with URLs:", imageUrls);
    const response = await axios.post(
      "https://open.tiktokapis.com/v2/post/publish/content/init/",
      {
        media_type: "PHOTO",
        post_mode: "DIRECT_POST",
        post_info: {
          title: content.text?.slice(0, 90) || "",
          description: content.description?.slice(0, 4000) || "",
          privacy_level: "SELF_ONLY",
          disable_comment: true,
          auto_add_music: true,
          brand_content_toggle: false,
          brand_organic_toggle: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          photo_images: imageUrls,
          photo_cover_index: 0, // Use first image as cover
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // console.log("Photo post successful");
    // console.log("Photo post response:", response.data);
    return this.createResult(true, response.data.data.publish_id);
  }

  private async getVideoDuration(filePath: string): Promise<number> {
    // Implement actual video duration detection here
    // This is a placeholder - you'll need to use a library like ffprobe
    return 500; // Default assumption of 500 seconds
  }

  private getFileType(filePath: string): "video" | "image" {
    const ext = filePath.split(".").pop()?.toLowerCase();
    const videoExtensions = ["mp4", "mov", "avi", "mkv"];
    const imageExtensions = ["jpg", "jpeg", "png", "webp"];

    if (videoExtensions.includes(ext!)) return "video";
    if (imageExtensions.includes(ext!)) return "image";

    throw new Error(`Unsupported file type: ${ext}`);
  }

  private getErrorDetails(error: any): string {
    if (error.response) {
      console.error("API Error Response:", {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });

      if (error.response.data?.error?.message) {
        return error.response.data.error.message;
      }
      if (error.response.data?.message) {
        return error.response.data.message;
      }
    }
    return error.message;
  }
}
