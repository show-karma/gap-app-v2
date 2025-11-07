import type { IFundingApplication } from '@/types/funding-platform';

// Mock the API client factory - must be hoisted before imports
jest.mock('@/utilities/auth/api-client', () => {
  const mockGet = jest.fn();
  const mockDelete = jest.fn();

  return {
    createAuthenticatedApiClient: jest.fn(() => ({
      get: mockGet,
      delete: mockDelete,
    })),
    // Export mocks for test access
    __mockGet: mockGet,
    __mockDelete: mockDelete,
  };
});

jest.mock('@/utilities/enviromentVars', () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: 'https://test-indexer.example.com',
  },
}));

// Import service and mock utilities
import { fetchApplicationByProjectUID, deleteApplication } from '../funding-applications';
import { INDEXER } from '@/utilities/indexer';
const { __mockGet: mockGet, __mockDelete: mockDelete } = jest.requireMock('@/utilities/auth/api-client');

describe('funding-applications service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('fetchApplicationByProjectUID', () => {
    const mockApplication: IFundingApplication = {
      id: 'app-123',
      projectUID: 'project-456',
      programId: 'program-789',
      chainID: 1,
      applicantEmail: 'test@example.com',
      applicationData: {},
      referenceNumber: 'REF-12345',
      status: 'pending' as const,
      statusHistory: [],
      submissionIP: '127.0.0.1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('should fetch application successfully', async () => {
      mockGet.mockResolvedValue({ data: mockApplication });

      const result = await fetchApplicationByProjectUID('project-456');

      expect(result).toEqual(mockApplication);
      expect(mockGet).toHaveBeenCalledWith(
        INDEXER.V2.APPLICATIONS.BY_PROJECT_UID('project-456')
      );
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should return null for 404 errors', async () => {
      mockGet.mockRejectedValue({
        response: { status: 404 },
      });

      const result = await fetchApplicationByProjectUID('nonexistent-project');

      expect(result).toBeNull();
      expect(mockGet).toHaveBeenCalledWith(
        INDEXER.V2.APPLICATIONS.BY_PROJECT_UID('nonexistent-project')
      );
    });

    it('should throw error for non-404 errors', async () => {
      const error = {
        response: { status: 500, statusText: 'Internal Server Error' },
        message: 'Server error',
      };
      mockGet.mockRejectedValue(error);

      await expect(fetchApplicationByProjectUID('project-123')).rejects.toEqual(error);
    });

    it('should throw error for network errors', async () => {
      const networkError = new Error('Network error');
      mockGet.mockRejectedValue(networkError);

      await expect(fetchApplicationByProjectUID('project-123')).rejects.toThrow('Network error');
    });

    it('should handle different project UIDs', async () => {
      mockGet.mockResolvedValue({ data: mockApplication });

      await fetchApplicationByProjectUID('project-abc');
      await fetchApplicationByProjectUID('project-xyz');

      expect(mockGet).toHaveBeenCalledTimes(2);
      expect(mockGet).toHaveBeenNthCalledWith(
        1,
        INDEXER.V2.APPLICATIONS.BY_PROJECT_UID('project-abc')
      );
      expect(mockGet).toHaveBeenNthCalledWith(
        2,
        INDEXER.V2.APPLICATIONS.BY_PROJECT_UID('project-xyz')
      );
    });

    it('should use correct API endpoint', async () => {
      mockGet.mockResolvedValue({ data: mockApplication });

      await fetchApplicationByProjectUID('test-project');

      const expectedEndpoint = INDEXER.V2.APPLICATIONS.BY_PROJECT_UID('test-project');
      expect(mockGet).toHaveBeenCalledWith(expectedEndpoint);
      expect(expectedEndpoint).toBe('/v2/funding-applications/project/test-project');
    });
  });

  describe('deleteApplication', () => {
    it('should delete application successfully', async () => {
      mockDelete.mockResolvedValue({ data: { success: true } });

      await deleteApplication('REF-12345');

      expect(mockDelete).toHaveBeenCalledWith(
        INDEXER.V2.APPLICATIONS.DELETE('REF-12345')
      );
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it('should log and throw error on deletion failure', async () => {
      const error = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: { message: 'Not authorized to delete' },
        },
        message: 'Request failed',
      };
      mockDelete.mockRejectedValue(error);

      await expect(deleteApplication('REF-12345')).rejects.toEqual(error);

      expect(console.error).toHaveBeenCalledWith(
        'Service layer: Failed to delete application',
        expect.objectContaining({
          referenceNumber: 'REF-12345',
          status: 403,
          statusText: 'Forbidden',
          errorMessage: 'Not authorized to delete',
        })
      );
    });

    it('should log error without response object', async () => {
      const error = new Error('Network timeout');
      mockDelete.mockRejectedValue(error);

      await expect(deleteApplication('REF-67890')).rejects.toThrow('Network timeout');

      expect(console.error).toHaveBeenCalledWith(
        'Service layer: Failed to delete application',
        expect.objectContaining({
          referenceNumber: 'REF-67890',
          errorMessage: 'Network timeout',
        })
      );
    });

    it('should handle different reference numbers', async () => {
      mockDelete.mockResolvedValue({ data: { success: true } });

      await deleteApplication('REF-001');
      await deleteApplication('REF-002');

      expect(mockDelete).toHaveBeenCalledTimes(2);
      expect(mockDelete).toHaveBeenNthCalledWith(
        1,
        INDEXER.V2.APPLICATIONS.DELETE('REF-001')
      );
      expect(mockDelete).toHaveBeenNthCalledWith(
        2,
        INDEXER.V2.APPLICATIONS.DELETE('REF-002')
      );
    });

    it('should use correct API endpoint', async () => {
      mockDelete.mockResolvedValue({ data: { success: true } });

      await deleteApplication('REF-TEST');

      const expectedEndpoint = INDEXER.V2.APPLICATIONS.DELETE('REF-TEST');
      expect(mockDelete).toHaveBeenCalledWith(expectedEndpoint);
      expect(expectedEndpoint).toBe('/v2/funding-applications/REF-TEST');
    });

    it('should include timestamp in error log', async () => {
      const error = new Error('Test error');
      mockDelete.mockRejectedValue(error);

      const beforeTime = new Date().toISOString();
      await expect(deleteApplication('REF-TIME')).rejects.toThrow('Test error');
      const afterTime = new Date().toISOString();

      expect(console.error).toHaveBeenCalledWith(
        'Service layer: Failed to delete application',
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );

      const loggedTimestamp = (console.error as jest.Mock).mock.calls[0][1].timestamp;
      expect(loggedTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(loggedTimestamp >= beforeTime).toBe(true);
      expect(loggedTimestamp <= afterTime).toBe(true);
    });
  });

  describe('API client initialization', () => {
    it('should have createAuthenticatedApiClient mocked', () => {
      const { createAuthenticatedApiClient } = jest.requireMock('@/utilities/auth/api-client');
      expect(createAuthenticatedApiClient).toBeDefined();
      expect(typeof createAuthenticatedApiClient).toBe('function');
    });
  });
});
