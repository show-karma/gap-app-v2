import { ApplicationComment } from '@/types/funding-platform';
import { envVars } from '@/utilities/enviromentVars';
import { getCookiesFromStoredWallet } from '@/utilities/getCookiesFromStoredWallet';

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

/**
 * Get auth headers from cookies
 */
function getAuthHeaders(): HeadersInit {
  // Get JWT from cookies using address-specific key
  const { token } = getCookiesFromStoredWallet();

  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': token }),
  };
}

export const applicationCommentsService = {
  /**
   * Get comments for an application
   */
  async getComments(applicationId: string): Promise<ApplicationComment[]> {
    const response = await fetch(`${API_URL}/v2/applications/${applicationId}/comments`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch comments: ${response.statusText}`);
    }

    const data = await response.json();
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
    const response = await fetch(`${API_URL}/v2/applications/${applicationId}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content, authorName }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Failed to create comment');
    }

    const data = await response.json();
    return data.comment;
  },

  /**
   * Edit a comment
   */
  async editComment(commentId: string, content: string): Promise<ApplicationComment> {
    const response = await fetch(`${API_URL}/v2/comments/${commentId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Failed to edit comment');
    }

    const data = await response.json();
    return data.comment;
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    const response = await fetch(`${API_URL}/v2/comments/${commentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Failed to delete comment');
    }
  },
};