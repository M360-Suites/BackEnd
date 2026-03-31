import axios from "axios";
import { PostContent, PostResult } from "../../../Types/types";
import { BasePoster } from "./basePoster";

export class PinterestPoster extends BasePoster {
  async post(content: PostContent): Promise<PostResult> {
    try {
      const accessToken = this.getAccessToken();

      if (!content.imageUrl) {
        return this.createResult(
          false,
          undefined,
          "Pinterest posts require an image"
        );
      }

      // Get user's boards
      const boardsResponse = await axios.get(
        "https://api.pinterest.com/v5/boards",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!boardsResponse.data.items.length) {
        return this.createResult(false, undefined, "No Pinterest boards found");
      }

      const boardId = boardsResponse.data.items[0].id;

      const response = await axios.post(
        "https://api.pinterest.com/v5/pins",
        {
          board_id: boardId,
          media_source: {
            source_type: "image_url",
            url: content.imageUrl,
          },
          description: content.text || content.description || "",
          title: content.title,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return this.createResult(true, response.data.id);
    } catch (error: any) {
      return this.createResult(
        false,
        undefined,
        error.response?.data?.message || error.message
      );
    }
  }
}
