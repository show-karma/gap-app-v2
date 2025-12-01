import type { ApplicationComment } from "@/types/funding-platform";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

// Create axios instance with authentication
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Comment API Error:", error.response?.data || error.message);
    throw error;
  }
);

export const applicationCommentsService = {
  /**
   * Get comments for an application
   */
  async getComments(applicationId: string, isAdmin?: boolean): Promise<ApplicationComment[]> {
    const params: any = {};
    if (isAdmin) {
      params.admin = "true";
    }

    const response = await apiClient.get(`/v2/applications/${applicationId}/comments`, {
      ...params,
    });

    return response.data.comments;
  },

  /**
   * Create a new comment
   */
  async createComment(
    applicationId: string,
    content: string,
    authorName?: string
  ): Promise<ApplicationComment> {
    const response = await apiClient.post(`/v2/applications/${applicationId}/comments`, {
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
