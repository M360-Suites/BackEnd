import axios from "axios";
import { PostContent, PostResult } from "../../../Types/types";
import { BasePoster } from "./basePoster";

import { google, youtube_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { SocialConnection } from "../../../Types/types";
import { decrypt } from "../../../Services/encryption";
import { Readable } from "stream";
import fs from "fs";
import retry from "async-retry";

// Constants for retry configuration
const MAX_RETRIES = 5;
const RETRIABLE_STATUS_CODES = [500, 502, 503, 504];
const MIN_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 60000; // 1 minute

export class YouTubePoster extends BasePoster {
  async getAuthenticatedClient(): Promise<youtube_v3.Youtube> {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    // console.log('Using access token: ', accessToken);

    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    return google.youtube({
      version: "v3",
      auth,
    });
  }

  async post(content: PostContent): Promise<PostResult> {
    let videoFile = content.file;
    try {
      const youtube = await this.getAuthenticatedClient();

      // Handle multiple files - take the first video

      if (Array.isArray(content.files)) {
        videoFile = content.files.find((f) => f.mimetype.startsWith("video/"));
        if (!videoFile) {
          return this.createResult(
            false,
            undefined,
            "No video file found in upload"
          );
        }
      }

      if (!videoFile || !videoFile.mimetype.startsWith("video/")) {
        return this.createResult(
          false,
          undefined,
          "YouTube posts require a video"
        );
      }
      // console.log("Got to upload");

      const requestBody: youtube_v3.Params$Resource$Videos$Insert["requestBody"] =
        {
          snippet: {
            title: content.text,
            description: content.description || "",
            tags: [],
            categoryId: "22",
          },
          status: {
            privacyStatus: content.privacyStatus || "public",
          },
        };

      // Handle Multer disk storage file object
      let fileStream: Readable;
      if (videoFile.path) {
        // This is a Multer disk storage file object
        fileStream = fs.createReadStream(videoFile.path);
      } else if (videoFile instanceof Buffer) {
        // Raw buffer
        fileStream = Readable.from(videoFile);
      } else if (typeof videoFile === "string") {
        // File path string
        fileStream = fs.createReadStream(videoFile);
      } else if (typeof videoFile.pipe === "function") {
        // Already a stream
        fileStream = videoFile as unknown as Readable;
      } else {
        throw new Error("Unsupported file format");
      }

      const media = {
        body: fileStream,
        resumable: true,
        chunkSize: 1024 * 1024 * 5, // 5MB chunks
      } as youtube_v3.Params$Resource$Videos$Insert["media"] & {
        resumable: boolean;
        chunkSize: number;
      };

      const result = await this.executeResumableUpload(
        youtube,
        requestBody,
        media
      );
      // console.log("Result", result);

      // Clean up the temporary file after successful upload
      if (videoFile.path) {
        try {
          fs.unlinkSync(videoFile.path);
        } catch (err) {
          console.error("Error deleting temp file:", err);
        }
      }

      return this.createResult(true, result?.id as string, undefined);
    } catch (error: any) {
      // Clean up the temporary file if upload fails
      if (videoFile?.path) {
        try {
          fs.unlinkSync(videoFile.path);
        } catch (err) {
          console.error("Error deleting temp file:", err);
        }
      }

      console.error("YouTube upload error:", error);
      return this.createResult(
        false,
        undefined,
        error.response?.data?.error?.message || error.message
      );
    }
  }

  private async executeResumableUpload(
    youtube: youtube_v3.Youtube,
    requestBody: youtube_v3.Params$Resource$Videos$Insert["requestBody"],
    media: youtube_v3.Params$Resource$Videos$Insert["media"]
  ): Promise<youtube_v3.Schema$Video | undefined> {
    return retry(
      async (bail, attempt) => {
        try {
          console.log(`Youtube upload attempt ${attempt}`);

          const response = await youtube.videos.insert(
            {
              part: ["snippet", "status"],
              requestBody,
              media,
              notifySubscribers: false,
            },
            {
              onUploadProgress: (evt) => {
                if (evt.bytesRead && evt.totalBytes) {
                  const progress = (evt.bytesRead / evt.totalBytes) * 100;
                  console.log(`Upload progress: ${progress.toFixed(2)}%`);
                }
              },
            }
          );

          return response.data;
        } catch (error: any) {
          console.error(`Upload error (attempt ${attempt}):`, error.message);

          // Check if this is a retriable error
          const isRetriable =
            RETRIABLE_STATUS_CODES.includes(error.code) ||
            (error.errors &&
              error.errors.some((e: any) =>
                RETRIABLE_STATUS_CODES.includes(e.code)
              ));

          if (!isRetriable) {
            // If not retriable, bail out
            bail(error);
            return;
          }

          // Calculate exponential backoff
          const delay = Math.min(
            MIN_RETRY_DELAY * Math.pow(2, attempt - 1),
            MAX_RETRY_DELAY
          );

          console.log(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));

          throw error; // Will trigger a retry
        }
      },
      {
        retries: MAX_RETRIES,
        minTimeout: MIN_RETRY_DELAY,
        maxTimeout: MAX_RETRY_DELAY,
      }
    );
  }

  // Optional: Method to check upload status
  public async checkUploadStatus(
    videoId: string
  ): Promise<youtube_v3.Schema$Video> {
    const youtube = await this.getAuthenticatedClient();

    const response = await youtube.videos.list({
      part: ["snippet", "status", "contentDetails"],
      id: [videoId],
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error("Video not found");
    }

    return response.data.items[0];
  }
}

// export class YouTubePoster extends BasePoster {
//   async post(content: PostContent): Promise<PostResult> {
//     try {
//       const accessToken = this.getAccessToken();

//       if (!content.videoUrl) {
//         return this.createResult(
//           false,
//           undefined,
//           "YouTube posts require a video"
//         );
//       }
//       console.log('Got to upload');

//       // This is a simplified version - actual video upload requires multipart form data
//       const response = await axios.post(
//         "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=PARTS",
//         {
//           snippet: {
//             title: content.title || "Untitled Video",
//             description: content.description || content.text || "",
//             tags: [],
//             categoryId: "22",
//           },
//           status: {
//             privacyStatus: "public",
//             embeddable: true,
//             license: "youtube",
//           },
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//             "Content-Type": "application/json; charset=UTF-8",
//           },
//         }
//       );
//       console.log('Response from Post: ', response.data);

//       return this.createResult(true, response.data.id);
//     } catch (error: any) {
//       return this.createResult(
//         false,
//         undefined,
//         error.response?.data?.error?.message || error.message
//       );
//     }
//   }
// }

// services/youtube.service.ts

// class YouTubeService {
//   private async getAuthenticatedClient(
//     connection: SocialConnection
//   ): Promise<youtube_v3.Youtube> {
//     const accessToken = decrypt(connection.accessToken);
//     const auth = new google.auth.OAuth2();
//     auth.setCredentials({
//       access_token: accessToken,
//       refresh_token: connection.refreshToken
//         ? decrypt(connection.refreshToken)
//         : undefined,
//     });

//     return google.youtube({
//       version: "v3",
//       auth,
//     });
//   }

//   public async uploadVideo(
//     connection: SocialConnection,
//     options: {
//       file: Buffer | Readable | string;
//       title: string;
//       description?: string;
//       categoryId?: string;
//       tags?: string[];
//       privacyStatus?: "public" | "private" | "unlisted";
//     }
//   ): Promise<youtube_v3.Schema$Video | undefined> {
//     const youtube = await this.getAuthenticatedClient(connection);

//     const requestBody: youtube_v3.Params$Resource$Videos$Insert["requestBody"] =
//       {
//         snippet: {
//           title: options.title,
//           description: options.description || "",
//           tags: options.tags,
//           categoryId: options.categoryId || "22",
//         },
//         status: {
//           privacyStatus: options.privacyStatus || "private",
//         },
//       };

//     // let media: youtube_v3.Params$Resource$Videos$Insert['media'];

//     // if (typeof options.file === 'string') {
//     //   media = {
//     //     body: fs.createReadStream(options.file),
//     //   };
//     // } else if (options.file instanceof Buffer) {
//     //   media = {
//     //     body: Readable.from(options.file),
//     //   };
//     // } else {
//     //   media = {
//     //     body: options.file,
//     //   };
//     // }

//     // // Configure resumable upload
//     // media.resumable = true;
//     // media.chunkSize = 1024 * 1024 * 5; // 5MB chunks

//     const media = {
//       body:
//         typeof options.file === "string"
//           ? fs.createReadStream(options.file)
//           : options.file instanceof Buffer
//           ? Readable.from(options.file)
//           : options.file,
//       resumable: true,
//       chunkSize: 1024 * 1024 * 5,
//     } as youtube_v3.Params$Resource$Videos$Insert["media"] & {
//       resumable: boolean;
//       chunkSize: number;
//     };

//     return this.executeResumableUpload(youtube, requestBody, media);
//   }

//   private async executeResumableUpload(
//     youtube: youtube_v3.Youtube,
//     requestBody: youtube_v3.Params$Resource$Videos$Insert["requestBody"],
//     media: youtube_v3.Params$Resource$Videos$Insert["media"]
//   ): Promise<youtube_v3.Schema$Video | undefined> {
//     return retry(
//       async (bail, attempt) => {
//         try {
//           console.log(`Upload attempt ${attempt}`);

//           const response = await youtube.videos.insert(
//             {
//               part: ["snippet", "status"],
//               requestBody,
//               media,
//               notifySubscribers: false,
//             },
//             {
//               onUploadProgress: (evt) => {
//                 if (evt.bytesRead && evt.totalBytes) {
//                   const progress = (evt.bytesRead / evt.totalBytes) * 100;
//                   console.log(`Upload progress: ${progress.toFixed(2)}%`);
//                 }
//               },
//             }
//           );

//           return response.data;
//         } catch (error: any) {
//           console.error(`Upload error (attempt ${attempt}):`, error.message);

//           // Check if this is a retriable error
//           const isRetriable =
//             RETRIABLE_STATUS_CODES.includes(error.code) ||
//             (error.errors &&
//               error.errors.some((e: any) =>
//                 RETRIABLE_STATUS_CODES.includes(e.code)
//               ));

//           if (!isRetriable) {
//             // If not retriable, bail out
//             bail(error);
//             return;
//           }

//           // Calculate exponential backoff
//           const delay = Math.min(
//             MIN_RETRY_DELAY * Math.pow(2, attempt - 1),
//             MAX_RETRY_DELAY
//           );

//           console.log(`Retrying in ${delay}ms...`);
//           await new Promise((resolve) => setTimeout(resolve, delay));

//           throw error; // Will trigger a retry
//         }
//       },
//       {
//         retries: MAX_RETRIES,
//         minTimeout: MIN_RETRY_DELAY,
//         maxTimeout: MAX_RETRY_DELAY,
//       }
//     );
//   }

//   // Optional: Method to check upload status
//   public async checkUploadStatus(
//     connection: SocialConnection,
//     videoId: string
//   ): Promise<youtube_v3.Schema$Video> {
//     const youtube = await this.getAuthenticatedClient(connection);

//     const response = await youtube.videos.list({
//       part: ["snippet", "status", "contentDetails"],
//       id: [videoId],
//     });

//     if (!response.data.items || response.data.items.length === 0) {
//       throw new Error("Video not found");
//     }

//     return response.data.items[0];
//   }
// }

// export default new YouTubeService();
