import axios from 'axios';
import { ApplicationComment } from '@/types/funding-platform';
import { envVars } from '@/utilities/enviromentVars';
import { getCookiesFromStoredWallet } from '@/utilities/getCookiesFromStoredWallet';

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

// Create axios instance with authentication
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
apiClient.interceptors.request.use((config) => {
  // Get auth token from cookies using address-specific key
  const { token } = getCookiesFromStoredWallet();
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Comment API Error:', error.response?.data || error.message);
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
      params.admin = 'true';
    }
    
    const response = await apiClient.get(`/v2/applications/${applicationId}/comments`, {
      params
    });

    return response.data.comments;
  },

  /**
   * Create a new comment
   */
  async createComment(
    applicationId: string,
    content: string,
    authorName?: string,
  ): Promise<ApplicationComment> {

    
    const response = await apiClient.post(
      `/v2/applications/${applicationId}/comments`,
      { content, authorName },
    );

    return response.data.comment;
  },

  /**
   * Edit a comment
   */
  async editComment(commentId: string, content: string): Promise<ApplicationComment> {
    const response = await apiClient.put(`/v2/comments/${commentId}`, {
      content
    });

    return response.data.comment;
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, isAdmin?: boolean): Promise<void> {
    const params: any = {};
    if (isAdmin) {
      params.admin = 'true';
    }
    
    await apiClient.delete(`/v2/comments/${commentId}`, {
      params
    });
  },
};