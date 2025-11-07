import axios, { AxiosInstance } from 'axios';
import { TokenManager } from '@/utilities/auth/token-manager';

// Mock dependencies BEFORE importing the service
jest.mock('axios');
jest.mock('@/utilities/auth/token-manager');
jest.mock('@/utilities/enviromentVars', () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: 'http://localhost:4000'
  }
}));

// Create a persistent mock instance using var (hoisted) so it's available in jest.mock factory
// Use proper typing with jest.Mocked to maintain type safety
let mockAxiosInstance: jest.Mocked<AxiosInstance>;

// Mock api-client - the factory runs at hoist time, so we initialize the mock here
jest.mock('@/utilities/auth/api-client', () => {
  // Initialize mock instance inline in the factory with proper typing
  const instance = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    request: jest.fn(),
    head: jest.fn(),
    options: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() }
    },
    defaults: {} as any,
    getUri: jest.fn(),
    deleteUri: jest.fn(),
  } as unknown as jest.Mocked<AxiosInstance>;

  // Assign to the outer variable so tests can access it
  mockAxiosInstance = instance;

  return {
    createAuthenticatedApiClient: jest.fn(() => instance)
  };
});

// Import the service AFTER all mocks are set up
import { PermissionsService, PermissionCheckOptions } from '@/services/permissions.service';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PermissionsService', () => {
  let service: PermissionsService;

  beforeEach(() => {
    // Clear all mock calls but keep the mock implementations
    jest.clearAllMocks();
    mockAxiosInstance.get.mockClear();
    mockAxiosInstance.post.mockClear();
    mockAxiosInstance.delete.mockClear();

    // Mock TokenManager
    (TokenManager.getToken as jest.Mock) = jest.fn().mockResolvedValue('test-token');

    service = new PermissionsService();
  });

  describe('checkPermission', () => {
    it('should check permission for a specific action', async () => {
      const options: PermissionCheckOptions = {
        programId: 'program-1',
        chainID: 1,
        action: 'review_applications'
      };

      const mockResponse = {
        hasPermission: true,
        permissions: ['review_applications', 'update_application_status']
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await service.checkPermission(options);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/v2/funding-program-configs/program-1/1/check-permission?action=review_applications'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should check permission without specific action', async () => {
      const options: PermissionCheckOptions = {
        programId: 'program-1',
        chainID: 1
      };

      const mockResponse = {
        hasPermission: true,
        permissions: ['view', 'read']
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await service.checkPermission(options);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/v2/funding-program-configs/program-1/1/check-permission?'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error if programId is missing', async () => {
      const options: PermissionCheckOptions = {
        chainID: 1
      };

      await expect(service.checkPermission(options)).rejects.toThrow(
        'Program ID and Chain ID are required for permission check'
      );
    });

    it('should throw error if chainID is missing', async () => {
      const options: PermissionCheckOptions = {
        programId: 'program-1'
      };

      await expect(service.checkPermission(options)).rejects.toThrow(
        'Program ID and Chain ID are required for permission check'
      );
    });

    it('should return no permission when user lacks access', async () => {
      const options: PermissionCheckOptions = {
        programId: 'program-1',
        chainID: 1,
        action: 'delete_program'
      };

      const mockResponse = {
        hasPermission: false,
        permissions: []
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await service.checkPermission(options);

      expect(result.hasPermission).toBe(false);
      expect(result.permissions).toEqual([]);
    });
  });

  describe('getUserPermissions', () => {
    it('should get all user permissions', async () => {
      const mockResponse = {
        permissions: [
          {
            resource: 'program-1',
            actions: ['review', 'approve'],
            role: 'reviewer'
          },
          {
            resource: 'program-2',
            actions: ['view'],
            role: 'viewer'
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await service.getUserPermissions();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v2/user/permissions?');
      expect(result).toEqual(mockResponse);
    });

    it('should get permissions for specific resource', async () => {
      const mockResponse = {
        permissions: [
          {
            resource: 'program-1',
            actions: ['review', 'approve'],
            role: 'reviewer'
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await service.getUserPermissions('program-1');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/v2/user/permissions?resource=program-1'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty permissions', async () => {
      const mockResponse = {
        permissions: []
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await service.getUserPermissions();

      expect(result.permissions).toEqual([]);
    });
  });

  describe('getReviewerPrograms', () => {
    it('should fetch programs where user is reviewer', async () => {
      const mockPrograms = [
        {
          programId: 'program-1',
          chainID: 1,
          name: 'Test Program 1',
          metadata: {
            status: 'active'
          },
          applicationConfig: {}
        },
        {
          programId: 'program-2',
          chainID: 1,
          name: 'Test Program 2',
          metadata: {
            status: 'active'
          },
          applicationConfig: {}
        }
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockPrograms });

      const result = await service.getReviewerPrograms();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/v2/funding-program-configs/my-reviewer-programs'
      );
      expect(result).toEqual(mockPrograms);
    });

    it('should return empty array when user is not a reviewer', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      const result = await service.getReviewerPrograms();

      expect(result).toEqual([]);
    });
  });

  describe('hasRole', () => {
    it('should return true if user has reviewer role', async () => {
      const mockPrograms = [
        {
          programId: 'program-1',
          chainID: 1,
          name: 'Test Program',
          metadata: { status: 'active' },
          applicationConfig: {}
        }
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockPrograms });

      const result = await service.hasRole('reviewer');

      expect(result).toBe(true);
    });

    it('should return false if user has no reviewer programs', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      const result = await service.hasRole('reviewer');

      expect(result).toBe(false);
    });

    it('should check role for specific resource', async () => {
      const mockResponse = {
        permissions: [
          {
            resource: 'program-1',
            actions: ['review'],
            role: 'admin'
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await service.hasRole('admin', 'program-1');

      expect(result).toBe(true);
    });

    it('should return false if role does not match', async () => {
      const mockResponse = {
        permissions: [
          {
            resource: 'program-1',
            actions: ['view'],
            role: 'viewer'
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await service.hasRole('admin', 'program-1');

      expect(result).toBe(false);
    });

    it('should return false for unknown roles without resource', async () => {
      const result = await service.hasRole('unknown');

      expect(result).toBe(false);
    });
  });

  describe('canPerformAction', () => {
    it('should return true if user can perform action', async () => {
      const mockResponse = {
        permissions: [
          {
            resource: 'program-1',
            actions: ['review', 'approve', 'reject'],
            role: 'reviewer'
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await service.canPerformAction('program-1', 'approve');

      expect(result).toBe(true);
    });

    it('should return false if user cannot perform action', async () => {
      const mockResponse = {
        permissions: [
          {
            resource: 'program-1',
            actions: ['view'],
            role: 'viewer'
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await service.canPerformAction('program-1', 'delete');

      expect(result).toBe(false);
    });

    it('should return false if resource not found', async () => {
      const mockResponse = {
        permissions: [
          {
            resource: 'program-2',
            actions: ['view'],
            role: 'viewer'
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await service.canPerformAction('program-1', 'view');

      expect(result).toBe(false);
    });
  });

  describe('checkMultiplePermissions', () => {
    it('should check permissions for multiple programs using batch endpoint', async () => {
      const programIds = [
        { programId: 'program-1', chainID: 1, action: 'review' },
        { programId: 'program-2', chainID: 1, action: 'approve' }
      ];

      const mockBatchResponse = {
        permissions: [
          {
            programId: 'program-1',
            chainID: 1,
            hasPermission: true,
            permissions: ['review', 'approve']
          },
          {
            programId: 'program-2',
            chainID: 1,
            hasPermission: false,
            permissions: []
          }
        ]
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockBatchResponse });

      const result = await service.checkMultiplePermissions(programIds);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/v2/funding-program-configs/batch-check-permissions',
        { programs: programIds }
      );
      expect(result.size).toBe(2);
      expect(result.get('program-1-1')).toEqual({
        hasPermission: true,
        permissions: ['review', 'approve']
      });
      expect(result.get('program-2-1')).toEqual({
        hasPermission: false,
        permissions: []
      });
    });

    it('should fall back to parallel calls if batch endpoint fails', async () => {
      const programIds = [
        { programId: 'program-1', chainID: 1 },
        { programId: 'program-2', chainID: 1 }
      ];

      // Batch endpoint fails
      mockAxiosInstance.post.mockRejectedValue(new Error('Batch endpoint not available'));

      // Individual calls succeed
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { hasPermission: true, permissions: ['review'] }
        })
        .mockResolvedValueOnce({
          data: { hasPermission: false, permissions: [] }
        });

      const result = await service.checkMultiplePermissions(programIds);

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(result.size).toBe(2);
    });

    it('should handle individual call failures in fallback mode', async () => {
      const programIds = [
        { programId: 'program-1', chainID: 1 },
        { programId: 'program-2', chainID: 1 }
      ];

      // Batch endpoint fails
      mockAxiosInstance.post.mockRejectedValue(new Error('Not available'));

      // First call succeeds, second fails
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { hasPermission: true, permissions: ['review'] }
        })
        .mockRejectedValueOnce(new Error('Permission check failed'));

      const result = await service.checkMultiplePermissions(programIds);

      expect(result.get('program-1-1')).toEqual({
        hasPermission: true,
        permissions: ['review']
      });
      expect(result.get('program-2-1')).toEqual({
        hasPermission: false,
        permissions: []
      });
    });

    it('should return empty map for empty input', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { permissions: [] } });

      const result = await service.checkMultiplePermissions([]);

      expect(result.size).toBe(0);
    });
  });
});
