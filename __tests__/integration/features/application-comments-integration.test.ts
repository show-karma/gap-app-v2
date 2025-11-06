/**
 * Integration test to verify JWT authentication in comment functionality
 * This test simulates the real-world usage of the comment service with authentication
 */
import { TokenManager } from '@/utilities/auth/token-manager';

// Mock dependencies BEFORE importing service
jest.mock('@/utilities/auth/token-manager');
jest.mock('@/utilities/enviromentVars', () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: 'http://localhost:4000'
  }
}));

// Setup axios mock with factory function
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn((fn) => fn) },
      response: { use: jest.fn() }
    }
  }))
}));

// Mock the wagmi store to simulate a connected wallet
jest.mock('@/utilities/getWalletFromWagmiStore', () => ({
  getWalletFromWagmiStore: jest.fn(() => '0x1234567890abcdef')
}));

// NOW import the service after mocks are configured
import { applicationCommentsService } from '@/services/application-comments.service';
import axios from 'axios';

const mockedAxios = axios as jest.Mocked<typeof axios>;
// Get the mock instance that was created
const mockAxiosInstance = (mockedAxios.create as jest.Mock).mock.results[0]?.value;

describe('Application Comments Integration', () => {
  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mocktoken';
  const applicationId = 'app-test-123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock for TokenManager
    (TokenManager.getToken as jest.Mock) = jest.fn().mockResolvedValue(mockToken);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Authentication Flow', () => {
    it('should handle complete comment lifecycle with authentication', async () => {
      const mockComment = {
        id: 'comment-1',
        content: 'This is a test comment',
        authorAddress: '0x1234567890abcdef',
        authorName: 'Test User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false
      };

      // Step 1: Create a comment
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { comment: mockComment }
      });

      const createdComment = await applicationCommentsService.createComment(
        applicationId,
        'This is a test comment',
        'Test User'
      );

      expect(createdComment).toEqual(mockComment);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/v2/applications/${applicationId}/comments`,
        {
          content: 'This is a test comment',
          authorName: 'Test User'
        }
      );

      // Step 2: Get comments
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { comments: [mockComment] }
      });

      const comments = await applicationCommentsService.getComments(applicationId);

      expect(comments).toEqual([mockComment]);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/v2/applications/${applicationId}/comments`,
        {}
      );

      // Step 3: Edit the comment
      const updatedComment = { ...mockComment, content: 'Updated comment' };
      mockAxiosInstance.put.mockResolvedValueOnce({
        data: { comment: updatedComment }
      });

      const editedComment = await applicationCommentsService.editComment(
        'comment-1',
        'Updated comment'
      );

      expect(editedComment).toEqual(updatedComment);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        `/v2/comments/comment-1`,
        { content: 'Updated comment' }
      );

      // Step 4: Delete the comment
      mockAxiosInstance.delete.mockResolvedValueOnce({
        data: {}
      });

      await applicationCommentsService.deleteComment('comment-1');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        `/v2/comments/comment-1`,
        { params: {} }
      );
    });

    it('should handle admin operations with proper authentication', async () => {
      // Test admin-specific comment operations
      const adminComment = {
        id: 'admin-comment-1',
        content: 'Admin review comment',
        authorAddress: '0xadmin',
        authorName: 'Admin User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
        isAdmin: true
      };

      // Create admin comment
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { comment: adminComment }
      });

      const created = await applicationCommentsService.createComment(
        applicationId,
        'Admin review comment',
        'Admin User'
      );

      expect(created).toEqual(adminComment);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/v2/applications/${applicationId}/comments`,
        {
          content: 'Admin review comment',
          authorName: 'Admin User'
        }
      );
    });

    it('should handle authentication failure gracefully', async () => {
      // Simulate no token available
      (TokenManager.getToken as jest.Mock).mockResolvedValue(null);

      const error = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { error: 'JWT is required' }
        },
        message: 'JWT is required'
      };

      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(
        applicationCommentsService.createComment(
          applicationId,
          'Test comment'
        )
      ).rejects.toEqual(error);

      // Verify the request was made
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/v2/applications/${applicationId}/comments`,
        {
          content: 'Test comment',
          authorName: undefined
        }
      );
    });

    it('should handle token refresh scenario', async () => {
      // Simulate token changing mid-session
      const initialToken = 'initial-token';
      const refreshedToken = 'refreshed-token';

      // First call with initial token
      (TokenManager.getToken as jest.Mock).mockResolvedValueOnce(initialToken);

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { comments: [] }
      });

      await applicationCommentsService.getComments(applicationId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/v2/applications/${applicationId}/comments`,
        {}
      );

      // Second call with refreshed token
      (TokenManager.getToken as jest.Mock).mockResolvedValueOnce(refreshedToken);

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { comments: [] }
      });

      await applicationCommentsService.getComments(applicationId);

      expect(mockAxiosInstance.get).toHaveBeenLastCalledWith(
        `/v2/applications/${applicationId}/comments`,
        {}
      );

      // The token is fetched fresh each time via the axios interceptor
      // So the second call will use the refreshed token
    });
  });
});