import fetchData from "@/utilities/fetchData";
import type { ApplicationComment } from "../types";

export const CommentsService = {
  /**
   * Get comments for an application (authenticated)
   */
  async getComments(applicationId: string): Promise<ApplicationComment[]> {
    const [data, error] = await fetchData<{ comments: ApplicationComment[] }>(
      `/v2/applications/${applicationId}/comments`,
      "GET"
    );
    if (error) return [];
    return data?.comments ?? [];
  },

  /**
   * Create a new comment on an application
   */
  async createComment(applicationId: string, content: string): Promise<ApplicationComment> {
    const [data, error] = await fetchData<{ comment: ApplicationComment }>(
      `/v2/applications/${applicationId}/comments`,
      "POST",
      { content }
    );
    if (error) throw new Error(error);
    return data!.comment;
  },

  /**
   * Edit an existing comment
   */
  async editComment(commentId: string, content: string): Promise<ApplicationComment> {
    const [data, error] = await fetchData<{ comment: ApplicationComment }>(
      `/v2/comments/${commentId}`,
      "PUT",
      { content }
    );
    if (error) throw new Error(error);
    return data!.comment;
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    const [, error] = await fetchData(`/v2/comments/${commentId}`, "DELETE");
    if (error) throw new Error(error);
  },

  /**
   * Get public comments for an application (no auth required)
   * Returns empty array if flag is disabled (403) or if there are no comments
   */
  async getPublicComments(referenceNumber: string): Promise<ApplicationComment[]> {
    const [data, error] = await fetchData<{ comments: ApplicationComment[] }>(
      `/v2/applications/${referenceNumber}/comments/public`,
      "GET",
      {},
      {},
      {},
      false // no auth required
    );
    if (error) return [];
    return data?.comments ?? [];
  },

  /**
   * Create a comment on a public application
   * Requires authentication - the backend will assign authorRole: "community"
   */
  async createPublicComment(referenceNumber: string, content: string): Promise<ApplicationComment> {
    const [data, error] = await fetchData<{ comment: ApplicationComment }>(
      `/v2/applications/${referenceNumber}/comments/public`,
      "POST",
      { content }
    );
    if (error) throw new Error(error);
    return data!.comment;
  },
};
