import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { IFundingApplication } from "@/types/funding-platform";

// Mock fetchData for GET requests
jest.mock("@/utilities/fetchData");

// Mock the API client factory for delete operations
jest.mock("@/utilities/auth/api-client", () => {
  const mockDelete = jest.fn();

  return {
    createAuthenticatedApiClient: jest.fn(() => ({
      delete: mockDelete,
    })),
    __mockDelete: mockDelete,
  };
});

jest.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "https://test-indexer.example.com",
  },
}));

import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
// Import service and mock utilities
import { deleteApplication, fetchApplicationByProjectUID } from "../funding-applications";

const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;
const { __mockDelete: mockDelete } = jest.requireMock("@/utilities/auth/api-client");

describe("funding-applications service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("fetchApplicationByProjectUID", () => {
    const mockApplication: IFundingApplication = {
      id: "app-123",
      projectUID: "project-456",
      programId: "program-789",
      chainID: 1,
      applicantEmail: "test@example.com",
      applicationData: {},
      referenceNumber: "REF-12345",
      status: "pending" as const,
      statusHistory: [],
      submissionIP: "127.0.0.1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("should fetch application successfully", async () => {
      mockFetchData.mockResolvedValue([mockApplication, null, null, 200]);

      const result = await fetchApplicationByProjectUID("project-456");

      expect(result).toEqual(mockApplication);
      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.APPLICATIONS.BY_PROJECT_UID("project-456")
      );
      expect(mockFetchData).toHaveBeenCalledTimes(1);
    });

    it("should return null for 404 errors", async () => {
      mockFetchData.mockResolvedValue([null, "404 not found", null, 404]);

      const result = await fetchApplicationByProjectUID("nonexistent-project");

      expect(result).toBeNull();
      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.APPLICATIONS.BY_PROJECT_UID("nonexistent-project")
      );
    });

    it("should throw error for non-404 errors", async () => {
      mockFetchData.mockResolvedValue([null, "Server error", null, 500]);

      await expect(fetchApplicationByProjectUID("project-123")).rejects.toThrow("Server error");
    });

    it("should handle different project UIDs", async () => {
      mockFetchData.mockResolvedValue([mockApplication, null, null, 200]);

      await fetchApplicationByProjectUID("project-abc");
      await fetchApplicationByProjectUID("project-xyz");

      expect(mockFetchData).toHaveBeenCalledTimes(2);
      expect(mockFetchData).toHaveBeenNthCalledWith(
        1,
        INDEXER.V2.APPLICATIONS.BY_PROJECT_UID("project-abc")
      );
      expect(mockFetchData).toHaveBeenNthCalledWith(
        2,
        INDEXER.V2.APPLICATIONS.BY_PROJECT_UID("project-xyz")
      );
    });

    it("should use correct API endpoint", async () => {
      mockFetchData.mockResolvedValue([mockApplication, null, null, 200]);

      await fetchApplicationByProjectUID("test-project");

      const expectedEndpoint = INDEXER.V2.APPLICATIONS.BY_PROJECT_UID("test-project");
      expect(mockFetchData).toHaveBeenCalledWith(expectedEndpoint);
      expect(expectedEndpoint).toBe("/v2/funding-applications/project/test-project");
    });

    it("should return null when data is null but no error", async () => {
      mockFetchData.mockResolvedValue([null, null, null, 200]);

      const result = await fetchApplicationByProjectUID("project-123");

      expect(result).toBeNull();
    });
  });

  describe("deleteApplication", () => {
    it("should delete application successfully", async () => {
      mockDelete.mockResolvedValue({ data: { success: true } });

      await deleteApplication("REF-12345");

      expect(mockDelete).toHaveBeenCalledWith(INDEXER.V2.APPLICATIONS.DELETE("REF-12345"));
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it("should log and throw error on deletion failure", async () => {
      const error = {
        response: {
          status: 403,
          statusText: "Forbidden",
          data: { message: "Not authorized to delete" },
        },
        message: "Request failed",
      };
      mockDelete.mockRejectedValue(error);

      await expect(deleteApplication("REF-12345")).rejects.toEqual(error);

      expect(console.error).toHaveBeenCalledWith(
        "Service layer: Failed to delete application",
        expect.objectContaining({
          referenceNumber: "REF-12345",
          status: 403,
          statusText: "Forbidden",
          errorMessage: "Not authorized to delete",
        })
      );
    });

    it("should log error without response object", async () => {
      const error = new Error("Network timeout");
      mockDelete.mockRejectedValue(error);

      await expect(deleteApplication("REF-67890")).rejects.toThrow("Network timeout");

      expect(console.error).toHaveBeenCalledWith(
        "Service layer: Failed to delete application",
        expect.objectContaining({
          referenceNumber: "REF-67890",
          errorMessage: "Network timeout",
        })
      );
    });

    it("should handle different reference numbers", async () => {
      mockDelete.mockResolvedValue({ data: { success: true } });

      await deleteApplication("REF-001");
      await deleteApplication("REF-002");

      expect(mockDelete).toHaveBeenCalledTimes(2);
      expect(mockDelete).toHaveBeenNthCalledWith(1, INDEXER.V2.APPLICATIONS.DELETE("REF-001"));
      expect(mockDelete).toHaveBeenNthCalledWith(2, INDEXER.V2.APPLICATIONS.DELETE("REF-002"));
    });

    it("should use correct API endpoint", async () => {
      mockDelete.mockResolvedValue({ data: { success: true } });

      await deleteApplication("REF-TEST");

      const expectedEndpoint = INDEXER.V2.APPLICATIONS.DELETE("REF-TEST");
      expect(mockDelete).toHaveBeenCalledWith(expectedEndpoint);
      expect(expectedEndpoint).toBe("/v2/funding-applications/REF-TEST");
    });

    it("should include timestamp in error log", async () => {
      const error = new Error("Test error");
      mockDelete.mockRejectedValue(error);

      const beforeTime = new Date().toISOString();
      await expect(deleteApplication("REF-TIME")).rejects.toThrow("Test error");
      const afterTime = new Date().toISOString();

      expect(console.error).toHaveBeenCalledWith(
        "Service layer: Failed to delete application",
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

  describe("Edge Cases and Additional Coverage", () => {
    describe("fetchApplicationByProjectUID - 404 handling edge cases", () => {
      it("should return null when error contains '404'", async () => {
        mockFetchData.mockResolvedValue([null, "404 not found", null, 404]);

        const result = await fetchApplicationByProjectUID("nonexistent");

        expect(result).toBeNull();
        expect(mockFetchData).toHaveBeenCalled();
      });

      it("should return null when error contains 'not found'", async () => {
        mockFetchData.mockResolvedValue([null, "Resource not found", null, 404]);

        const result = await fetchApplicationByProjectUID("nonexistent");

        expect(result).toBeNull();
      });

      it("should throw error when error does not contain 404 or not found", async () => {
        mockFetchData.mockResolvedValue([null, "Forbidden", null, 403]);

        await expect(fetchApplicationByProjectUID("project-123")).rejects.toThrow("Forbidden");
      });
    });

    describe("deleteApplication - error logging edge cases", () => {
      it("should log error with all fields when response has full error data", async () => {
        const error = {
          response: {
            status: 500,
            statusText: "Internal Server Error",
            data: { message: "Database connection failed" },
          },
          message: "Request failed",
        };
        mockDelete.mockRejectedValue(error);

        await expect(deleteApplication("REF-ERROR")).rejects.toEqual(error);

        expect(console.error).toHaveBeenCalledWith(
          "Service layer: Failed to delete application",
          expect.objectContaining({
            referenceNumber: "REF-ERROR",
            status: 500,
            statusText: "Internal Server Error",
            errorMessage: "Database connection failed",
            timestamp: expect.any(String),
          })
        );
      });

      it("should log error with message fallback when response.data.message is missing", async () => {
        const error = {
          response: {
            status: 500,
            statusText: "Internal Server Error",
            data: {},
          },
          message: "Request failed",
        };
        mockDelete.mockRejectedValue(error);

        await expect(deleteApplication("REF-ERROR2")).rejects.toEqual(error);

        expect(console.error).toHaveBeenCalledWith(
          "Service layer: Failed to delete application",
          expect.objectContaining({
            referenceNumber: "REF-ERROR2",
            status: 500,
            statusText: "Internal Server Error",
            errorMessage: "Request failed", // Falls back to error.message
            timestamp: expect.any(String),
          })
        );
      });

      it("should log error with only message when response is missing", async () => {
        const error = new Error("Network timeout");
        mockDelete.mockRejectedValue(error);

        await expect(deleteApplication("REF-NO-RESPONSE")).rejects.toThrow("Network timeout");

        expect(console.error).toHaveBeenCalledWith(
          "Service layer: Failed to delete application",
          expect.objectContaining({
            referenceNumber: "REF-NO-RESPONSE",
            status: undefined,
            statusText: undefined,
            errorMessage: "Network timeout",
            timestamp: expect.any(String),
          })
        );
      });

      it("should re-throw error after logging (critical for error propagation)", async () => {
        const error = {
          response: {
            status: 500,
            statusText: "Internal Server Error",
            data: { message: "Server error" },
          },
          message: "Request failed",
        };
        mockDelete.mockRejectedValue(error);

        // Verify error is re-thrown (not swallowed)
        await expect(deleteApplication("REF-RETHROW")).rejects.toEqual(error);

        // Verify logging happened before re-throw
        expect(console.error).toHaveBeenCalled();
      });
    });

    describe("Network failure scenarios", () => {
      it("should handle timeout errors", async () => {
        mockFetchData.mockResolvedValue([null, "timeout of 30000ms exceeded", null, 408]);

        await expect(fetchApplicationByProjectUID("project-timeout")).rejects.toThrow(
          "timeout of 30000ms exceeded"
        );
      });

      it("should handle connection refused errors", async () => {
        const connectionError = {
          code: "ECONNREFUSED",
          message: "Connection refused",
        };
        mockDelete.mockRejectedValue(connectionError);

        await expect(deleteApplication("REF-CONN")).rejects.toEqual(connectionError);
        expect(console.error).toHaveBeenCalled();
      });
    });
  });

  describe("API client initialization", () => {
    it("should have createAuthenticatedApiClient mocked", () => {
      const { createAuthenticatedApiClient } = jest.requireMock("@/utilities/auth/api-client");
      expect(createAuthenticatedApiClient).toBeDefined();
      expect(typeof createAuthenticatedApiClient).toBe("function");
    });
  });
});
