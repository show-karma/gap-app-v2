import { applicationCommentsService } from '../application-comments.service';
import { getCookiesFromStoredWallet } from '@/utilities/getCookiesFromStoredWallet';

// Mock the dependencies
jest.mock('@/utilities/getCookiesFromStoredWallet');
jest.mock('@/utilities/enviromentVars', () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: 'http://localhost:4000'
  }
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('applicationCommentsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should include JWT token in Authorization header when creating a comment', async () => {
      const mockToken = 'test-jwt-token';
      const mockComment = {
        id: '1',
        content: 'Test comment',
        authorAddress: '0x123',
        authorName: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false
      };

      // Mock getCookiesFromStoredWallet to return a token
      (getCookiesFromStoredWallet as jest.Mock).mockReturnValue({
        token: mockToken,
        walletType: 'eoa'
      });

      // Mock successful fetch response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ comment: mockComment })
      });

      // Call the service
      await applicationCommentsService.createComment(
        'app-123',
        'Test comment',
        'Test User'
      );

      // Verify fetch was called with correct headers
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/v2/applications/app-123/comments',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': mockToken
          },
          body: JSON.stringify({ 
            content: 'Test comment', 
            authorName: 'Test User' 
          })
        })
      );
    });

    it('should not include Authorization header when no token is available', async () => {
      // Mock getCookiesFromStoredWallet to return no token
      (getCookiesFromStoredWallet as jest.Mock).mockReturnValue({
        token: undefined,
        walletType: undefined
      });

      // Mock successful fetch response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ comments: [] })
      });

      // Call the service
      await applicationCommentsService.getComments('app-123');

      // Verify fetch was called without Authorization header
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/v2/applications/app-123/comments',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
      
      // Verify Authorization header is not present
      const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(callArgs.headers.Authorization).toBeUndefined();
    });

    it('should include JWT token for all service methods', async () => {
      const mockToken = 'test-jwt-token';
      
      // Mock getCookiesFromStoredWallet to return a token
      (getCookiesFromStoredWallet as jest.Mock).mockReturnValue({
        token: mockToken,
        walletType: 'eoa'
      });

      // Mock successful fetch responses
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ })
      });

      // Test getComments
      await applicationCommentsService.getComments('app-123');
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': mockToken
          })
        })
      );

      // Test editComment
      await applicationCommentsService.editComment('comment-1', 'Updated content');
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': mockToken
          })
        })
      );

      // Test deleteComment
      await applicationCommentsService.deleteComment('comment-1');
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': mockToken
          })
        })
      );
    });
  });
});