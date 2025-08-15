import { ApplicationComment } from '@/types/funding-platform';
import { envVars } from '@/utilities/enviromentVars';

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

/**
 * Get auth headers from cookies
 */
function getAuthHeaders(): HeadersInit {
  // Get JWT from cookies (implementation depends on your auth setup)
  const token = typeof window !== 'undefined' 
    ? document.cookie
        .split('; ')
        .find(row => row.startsWith('karma-gap-jwt='))
        ?.split('=')[1]
    : '';

  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

export const applicationCommentsService = {
  /**
   * Get comments for an application
   */
  async getComments(applicationId: string, isAdmin: boolean = false): Promise<ApplicationComment[]> {
    const queryParams = isAdmin ? '?admin=true' : '';
    const response = await fetch(`${API_URL}/v2/applications/${applicationId}/comments${queryParams}`, {
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
    isAdmin: boolean = false,
    authorName?: string
  ): Promise<ApplicationComment> {
    const queryParams = isAdmin ? '?admin=true' : '';
    const response = await fetch(`${API_URL}/v2/applications/${applicationId}/comments${queryParams}`, {
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
  async deleteComment(commentId: string, isAdmin: boolean = false): Promise<void> {
    const queryParams = isAdmin ? '?admin=true' : '';
    const response = await fetch(`${API_URL}/v2/comments/${commentId}${queryParams}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Failed to delete comment');
    }
  },
};