/**
 * Integration test to verify JWT authentication in comment functionality
 * This test simulates the real-world usage of the comment service with authentication
 */
import { applicationCommentsService } from '../application-comments.service';
import { TokenManager } from '@/utilities/auth/token-manager';

// Mock dependencies
jest.mock('@/utilities/auth/token-manager');
jest.mock('@/utilities/enviromentVars', () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: 'http://localhost:4000'
  }
}));

// Mock the wagmi store to simulate a connected wallet
jest.mock('@/utilities/getWalletFromWagmiStore', () => ({
  getWalletFromWagmiStore: jest.fn(() => '0x1234567890abcdef')
}));

describe('Application Comments Integration', () => {
  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mocktoken';
  const applicationId = 'app-test-123';

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    
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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ comment: mockComment })
      });

      const createdComment = await applicationCommentsService.createComment(
        applicationId,
        'This is a test comment',
        'Test User'
      );

      expect(createdComment).toEqual(mockComment);
      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:4000/v2/applications/${applicationId}/comments`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': mockToken
          },
          body: JSON.stringify({
            content: 'This is a test comment',
            authorName: 'Test User'
          })
        })
      );

      // Step 2: Get comments
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ comments: [mockComment] })
      });

      const comments = await applicationCommentsService.getComments(applicationId);
      
      expect(comments).toEqual([mockComment]);
      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:4000/v2/applications/${applicationId}/comments`,
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': mockToken
          }
        })
      );

      // Step 3: Edit the comment
      const updatedComment = { ...mockComment, content: 'Updated comment' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ comment: updatedComment })
      });

      const editedComment = await applicationCommentsService.editComment(
        'comment-1',
        'Updated comment'
      );

      expect(editedComment).toEqual(updatedComment);
      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:4000/v2/comments/comment-1`,
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': mockToken
          },
          body: JSON.stringify({ content: 'Updated comment' })
        })
      );

      // Step 4: Delete the comment
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await applicationCommentsService.deleteComment('comment-1');

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:4000/v2/comments/comment-1`,
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': mockToken
          }
        })
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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ comment: adminComment })
      });

      const created = await applicationCommentsService.createComment(
        applicationId,
        'Admin review comment',
        'Admin User'
      );

      expect(created).toEqual(adminComment);
      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:4000/v2/applications/${applicationId}/comments`,
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': mockToken
          }
        })
      );
    });

    it('should handle authentication failure gracefully', async () => {
      // Simulate no token available
      (TokenManager.getToken as jest.Mock).mockResolvedValue(null);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'JWT is required' })
      });

      await expect(
        applicationCommentsService.createComment(
          applicationId,
          'Test comment'
        )
      ).rejects.toThrow('JWT is required');

      // Verify the request was made without Authorization header
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json'
            // No Authorization header
          }
        })
      );
    });

    it('should handle token refresh scenario', async () => {
      // Simulate token changing mid-session
      const initialToken = 'initial-token';
      const refreshedToken = 'refreshed-token';

      // First call with initial token
      (TokenManager.getToken as jest.Mock).mockResolvedValueOnce(initialToken);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ comments: [] })
      });

      await applicationCommentsService.getComments(applicationId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': initialToken
          })
        })
      );

      // Second call with refreshed token
      (TokenManager.getToken as jest.Mock).mockResolvedValueOnce(refreshedToken);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ comments: [] })
      });

      await applicationCommentsService.getComments(applicationId);

      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': refreshedToken
          })
        })
      );
    });
  });
});