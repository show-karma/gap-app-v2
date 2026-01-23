import { beforeEach, describe, expect, it } from "bun:test";
import type { AxiosInstance } from "axios";

// All mocks are pre-registered in tests/bun-setup.ts
// Access mocks via globalThis.__mocks__

// Import the service AFTER mocks are set up (they're pre-registered in bun-setup.ts)
import {
  type AddReviewerRequest,
  programReviewersService,
} from "@/services/program-reviewers.service";

// Get mocks from globalThis
const getMocks = () => (globalThis as any).__mocks__;

describe("programReviewersService", () => {
  let mockFetchData: any;
  let mockApiClient: any;
  let mockAxios: any;

  beforeEach(() => {
    const mocks = getMocks();
    mockFetchData = mocks.fetchData;
    mockApiClient = mocks.apiClient;
    mockAxios = mocks.axios;

    // Clear mocks
    if (mockFetchData?.mockClear) mockFetchData.mockClear();
    if (mockApiClient?.post?.mockClear) mockApiClient.post.mockClear();
    if (mockApiClient?.delete?.mockClear) mockApiClient.delete.mockClear();

    // Setup default behavior for TokenManager
    if (mocks.TokenManager?.getToken?.mockImplementation) {
      mocks.TokenManager.getToken.mockImplementation(() => Promise.resolve("test-token"));
    }
  });

  describe("getReviewers", () => {
    it("should fetch and return program reviewers", async () => {
      const mockApiResponse = {
        reviewers: [
          {
            publicAddress: "0x1234567890123456789012345678901234567890",
            programId: "program-1",
            chainID: 1,
            userProfile: {
              id: "user-1",
              publicAddress: "0x1234567890123456789012345678901234567890",
              name: "Alice Admin",
              email: "alice@example.com",
              telegram: "@aliceadmin",
              createdAt: "2024-01-01T00:00:00Z",
              updatedAt: "2024-01-01T00:00:00Z",
            },
            assignedAt: "2024-01-01T00:00:00Z",
            assignedBy: "0x9876543210987654321098765432109876543210",
          },
        ],
      };

      mockFetchData.mockResolvedValue([mockApiResponse, null, null, 200]);

      const result = await programReviewersService.getReviewers("program-1");

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("program-1"));
      expect(result).toEqual([
        {
          publicAddress: "0x1234567890123456789012345678901234567890",
          name: "Alice Admin",
          email: "alice@example.com",
          telegram: "@aliceadmin",
          assignedAt: "2024-01-01T00:00:00Z",
          assignedBy: "0x9876543210987654321098765432109876543210",
        },
      ]);
    });

    it("should return empty array when no reviewers found error", async () => {
      mockFetchData.mockResolvedValue([null, "Program Reviewer Not Found", null, 404]);

      const result = await programReviewersService.getReviewers("program-1");

      expect(result).toEqual([]);
    });

    it("should handle missing reviewers array in response", async () => {
      mockFetchData.mockResolvedValue([{}, null, null, 200]);

      const result = await programReviewersService.getReviewers("program-1");

      expect(result).toEqual([]);
    });

    it("should throw error for server errors", async () => {
      mockFetchData.mockResolvedValue([null, "Internal Server Error", null, 500]);

      await expect(programReviewersService.getReviewers("program-1")).rejects.toThrow(
        "Internal Server Error"
      );
    });
  });

  describe("addReviewer", () => {
    it("should add a program reviewer successfully", async () => {
      const reviewerData: AddReviewerRequest = {
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "Bob Reviewer",
        email: "bob@example.com",
        telegram: "@bobreviewer",
      };

      const mockApiResponse = {
        reviewer: {
          publicAddress: "0x1234567890123456789012345678901234567890",
          programId: "program-1",
          chainID: 1,
          userProfile: {
            id: "user-2",
            publicAddress: "0x1234567890123456789012345678901234567890",
            name: "Bob Reviewer",
            email: "bob@example.com",
            telegram: "@bobreviewer",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
          assignedAt: "2024-01-01T00:00:00Z",
        },
      };

      mockApiClient.post.mockResolvedValue({ data: mockApiResponse });

      const result = await programReviewersService.addReviewer("program-1", reviewerData);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("program-1"),
        reviewerData
      );
      expect(result.name).toBe("Bob Reviewer");
      expect(result.email).toBe("bob@example.com");
    });

    it("should handle response without reviewer data", async () => {
      const reviewerData: AddReviewerRequest = {
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "Carol Reviewer",
        email: "carol@example.com",
      };

      mockApiClient.post.mockResolvedValue({ data: {} });

      const result = await programReviewersService.addReviewer("program-1", reviewerData);

      expect(result.publicAddress).toBe(reviewerData.publicAddress);
      expect(result.name).toBe(reviewerData.name);
      expect(result.assignedAt).toBeDefined();
    });
  });

  describe("removeReviewer", () => {
    it("should remove a program reviewer successfully", async () => {
      mockApiClient.delete.mockResolvedValue({ data: {} });

      await programReviewersService.removeReviewer(
        "program-1",
        "0x1234567890123456789012345678901234567890"
      );

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        "/v2/funding-program-configs/program-1/reviewers/0x1234567890123456789012345678901234567890"
      );
    });
  });

  describe("addMultipleReviewers", () => {
    it("should add multiple reviewers successfully", async () => {
      const reviewers: AddReviewerRequest[] = [
        {
          publicAddress: "0x1111111111111111111111111111111111111111",
          name: "Reviewer 1",
          email: "reviewer1@example.com",
        },
        {
          publicAddress: "0x2222222222222222222222222222222222222222",
          name: "Reviewer 2",
          email: "reviewer2@example.com",
        },
      ];

      mockApiClient.post.mockResolvedValue({
        data: {
          reviewer: {
            publicAddress: "0x1111111111111111111111111111111111111111",
            programId: "program-1",
            chainID: 1,
            userProfile: {
              id: "user-1",
              publicAddress: "0x1111111111111111111111111111111111111111",
              name: "Reviewer 1",
              email: "reviewer1@example.com",
              createdAt: "2024-01-01T00:00:00Z",
              updatedAt: "2024-01-01T00:00:00Z",
            },
            assignedAt: "2024-01-01T00:00:00Z",
          },
        },
      });

      const result = await programReviewersService.addMultipleReviewers("program-1", reviewers);

      expect(result.added).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle partial failures", async () => {
      const reviewers: AddReviewerRequest[] = [
        {
          publicAddress: "0x1111111111111111111111111111111111111111",
          name: "Reviewer 1",
          email: "reviewer1@example.com",
        },
        {
          publicAddress: "invalid",
          name: "Reviewer 2",
          email: "reviewer2@example.com",
        },
      ];

      // Mock axios.isAxiosError for this test
      mockAxios.isAxiosError.mockImplementation(
        (payload: any): payload is import("axios").AxiosError => true
      );

      mockApiClient.post
        .mockResolvedValueOnce({
          data: {
            reviewer: {
              publicAddress: "0x1111111111111111111111111111111111111111",
              programId: "program-1",
              chainID: 1,
              userProfile: {
                id: "user-1",
                publicAddress: "0x1111111111111111111111111111111111111111",
                name: "Reviewer 1",
                email: "reviewer1@example.com",
                createdAt: "2024-01-01T00:00:00Z",
                updatedAt: "2024-01-01T00:00:00Z",
              },
              assignedAt: "2024-01-01T00:00:00Z",
            },
          },
        })
        .mockRejectedValueOnce({
          isAxiosError: true,
          response: {
            data: {
              message: "Invalid wallet address",
            },
          },
        });

      const result = await programReviewersService.addMultipleReviewers("program-1", reviewers);

      expect(result.added).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe("Invalid wallet address");
    });
  });

  describe("validateReviewerData", () => {
    it("should validate correct reviewer data", () => {
      const data: AddReviewerRequest = {
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "Valid User",
        email: "valid@example.com",
        telegram: "@validuser",
      };

      const result = programReviewersService.validateReviewerData(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid data", () => {
      const data: AddReviewerRequest = {
        publicAddress: "invalid",
        name: "",
        email: "invalid-email",
      };

      const result = programReviewersService.validateReviewerData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
