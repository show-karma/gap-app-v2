import type { ApplicationComment } from "@/types/funding-platform";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

// Keep apiClient for mutations (POST, PUT, DELETE)
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

export const applicationCommentsService = {
  /**
   * Get comments for an application
   */
  async getComments(applicationId: string, isAdmin?: boolean): Promise<ApplicationComment[]> {
    const params: Record<string, string> = {};
    if (isAdmin) {
      params.admin = "true";
    }

    const [data, error] = await fetchData<{ comments: ApplicationComment[] }>(
      INDEXER.V2.APPLICATIONS.COMMENTS(applicationId),
      "GET",
      {},
      params
    );

    if (error || !data) {
      console.error("Comment API Error:", error);
      throw new Error(error || "Failed to fetch comments");
    }

    return data.comments;
  },

  /**
   * Create a new comment
   */
  async createComment(
    applicationId: string,
    content: string,
    authorName?: string
  ): Promise<ApplicationComment> {
    const response = await apiClient.post(INDEXER.V2.APPLICATIONS.COMMENTS(applicationId), {
      content,
      authorName,
    });

    return response.data.comment;
  },

  /**
   * Edit a comment
   */
  async editComment(commentId: string, content: string): Promise<ApplicationComment> {
    const response = await apiClient.put(`/v2/comments/${commentId}`, {
      content,
    });

    return response.data.comment;
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, isAdmin?: boolean): Promise<void> {
    const params: any = {};
    if (isAdmin) {
      params.admin = "true";
    }

    await apiClient.delete(`/v2/comments/${commentId}`, {
      params,
    });
  },
};
