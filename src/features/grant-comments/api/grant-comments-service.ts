import fetchData from "@/utilities/fetchData";
import type { GrantComment } from "../types";

export class GrantCommentsService {
  /**
   * Get comments for a grant (authenticated)
   */
  static async getComments(projectUID: string, programId: string): Promise<GrantComment[]> {
    const [data, error] = await fetchData<{ comments: GrantComment[] }>(
      `/v2/grants/${projectUID}/${programId}/comments`,
      "GET"
    );
    if (error) return [];
    return data?.comments ?? [];
  }

  /**
   * Create a new comment on a grant
   */
  static async createComment(
    projectUID: string,
    programId: string,
    content: string
  ): Promise<GrantComment> {
    const [data, error] = await fetchData<{ comment: GrantComment }>(
      `/v2/grants/${projectUID}/${programId}/comments`,
      "POST",
      { content }
    );
    if (error) throw new Error(error);
    return data!.comment;
  }

  /**
   * Edit an existing grant comment
   */
  static async editComment(commentId: string, content: string): Promise<GrantComment> {
    const [data, error] = await fetchData<{ comment: GrantComment }>(
      `/v2/grant-comments/${commentId}`,
      "PUT",
      { content }
    );
    if (error) throw new Error(error);
    return data!.comment;
  }

  /**
   * Delete a grant comment
   */
  static async deleteComment(commentId: string): Promise<void> {
    const [, error] = await fetchData(`/v2/grant-comments/${commentId}`, "DELETE");
    if (error) throw new Error(error);
  }
}
