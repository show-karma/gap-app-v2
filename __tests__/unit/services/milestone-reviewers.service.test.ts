import axios, { type AxiosInstance } from "axios";
import { TokenManager } from "@/utilities/auth/token-manager";

// Mock dependencies BEFORE importing the service
jest.mock("axios");
jest.mock("@/utilities/auth/token-manager");
jest.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));

// Mock fetchData for GET requests
jest.mock("@/utilities/fetchData");

// Create a persistent mock instance using var (hoisted) so it's available in jest.mock factory
var mockAxiosInstance: jest.Mocked<AxiosInstance>;

// Mock api-client for mutations (POST, DELETE)
jest.mock("@/utilities/auth/api-client", () => {
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
      response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
    },
    defaults: {} as any,
    getUri: jest.fn(),
    deleteUri: jest.fn(),
  } as unknown as jest.Mocked<AxiosInstance>;

  mockAxiosInstance = instance;

  return {
    createAuthenticatedApiClient: jest.fn(() => instance),
  };
});

// Import the service AFTER all mocks are set up
import {
  type AddMilestoneReviewerRequest,
  milestoneReviewersService,
} from "@/services/milestone-reviewers.service";
// Import fetchData mock
import fetchData from "@/utilities/fetchData";

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;

describe("milestoneReviewersService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAxiosInstance.post.mockClear();
    mockAxiosInstance.delete.mockClear();

    // Mock TokenManager
    (TokenManager.getToken as jest.Mock) = jest.fn().mockResolvedValue("test-token");
  });

  describe("getReviewers", () => {
    it("should fetch and return reviewers for a program", async () => {
      const mockApiResponse = [
        {
          publicAddress: "0x1234567890123456789012345678901234567890",
          programId: "program-1",
          chainID: 1,
          userProfile: {
            id: "user-1",
            publicAddress: "0x1234567890123456789012345678901234567890",
            name: "John Doe",
            email: "john@example.com",
            telegram: "@johndoe",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
          assignedAt: "2024-01-01T00:00:00Z",
          assignedBy: "0x9876543210987654321098765432109876543210",
        },
      ];

      mockFetchData.mockResolvedValue([mockApiResponse, null, null, 200]);

      const result = await milestoneReviewersService.getReviewers("program-1", 1);

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("program-1"));
      expect(result).toEqual([
        {
          publicAddress: "0x1234567890123456789012345678901234567890",
          name: "John Doe",
          email: "john@example.com",
          telegram: "@johndoe",
          assignedAt: "2024-01-01T00:00:00Z",
          assignedBy: "0x9876543210987654321098765432109876543210",
        },
      ]);
    });

    it("should return empty array when no reviewers found", async () => {
      mockFetchData.mockResolvedValue([null, "Milestone Reviewer Not Found", null, 404]);

      const result = await milestoneReviewersService.getReviewers("program-1", 1);

      expect(result).toEqual([]);
    });

    it('should return empty array when API returns "No reviewers found" message', async () => {
      mockFetchData.mockResolvedValue([null, "No reviewers found for this program", null, 404]);

      const result = await milestoneReviewersService.getReviewers("program-1", 1);

      expect(result).toEqual([]);
    });

    it("should handle missing user profile data gracefully", async () => {
      const mockApiResponse = [
        {
          publicAddress: "0x1234567890123456789012345678901234567890",
          programId: "program-1",
          chainID: 1,
          userProfile: null,
          assignedAt: "2024-01-01T00:00:00Z",
        },
      ];

      mockFetchData.mockResolvedValue([mockApiResponse, null, null, 200]);

      const result = await milestoneReviewersService.getReviewers("program-1", 1);

      expect(result[0]).toEqual({
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "",
        email: "",
        telegram: "",
        assignedAt: "2024-01-01T00:00:00Z",
        assignedBy: undefined,
      });
    });

    it("should throw error for non-404 errors", async () => {
      mockFetchData.mockResolvedValue([null, "Internal Server Error", null, 500]);

      await expect(milestoneReviewersService.getReviewers("program-1", 1)).rejects.toThrow(
        "Internal Server Error"
      );
    });
  });

  describe("addReviewer", () => {
    it("should add a milestone reviewer successfully", async () => {
      const reviewerData: AddMilestoneReviewerRequest = {
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "Jane Smith",
        email: "jane@example.com",
        telegram: "@janesmith",
      };

      const mockApiResponse = {
        reviewer: {
          publicAddress: "0x1234567890123456789012345678901234567890",
          programId: "program-1",
          chainID: 1,
          userProfile: {
            id: "user-2",
            publicAddress: "0x1234567890123456789012345678901234567890",
            name: "Jane Smith",
            email: "jane@example.com",
            telegram: "@janesmith",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
          assignedAt: "2024-01-01T00:00:00Z",
          assignedBy: "0x9876543210987654321098765432109876543210",
        },
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockApiResponse });

      const result = await milestoneReviewersService.addReviewer("program-1", 1, reviewerData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining("program-1"),
        reviewerData
      );
      expect(result).toEqual({
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "Jane Smith",
        email: "jane@example.com",
        telegram: "@janesmith",
        assignedAt: "2024-01-01T00:00:00Z",
        assignedBy: "0x9876543210987654321098765432109876543210",
      });
    });

    it("should handle case where API returns success without reviewer data", async () => {
      const reviewerData: AddMilestoneReviewerRequest = {
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "Jane Smith",
        email: "jane@example.com",
      };

      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      const result = await milestoneReviewersService.addReviewer("program-1", 1, reviewerData);

      expect(result.publicAddress).toBe(reviewerData.publicAddress);
      expect(result.name).toBe(reviewerData.name);
      expect(result.email).toBe(reviewerData.email);
      expect(result.assignedAt).toBeDefined();
    });

    it("should add reviewer without telegram", async () => {
      const reviewerData: AddMilestoneReviewerRequest = {
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "Bob Jones",
        email: "bob@example.com",
      };

      const mockApiResponse = {
        reviewer: {
          publicAddress: "0x1234567890123456789012345678901234567890",
          programId: "program-1",
          chainID: 1,
          userProfile: {
            id: "user-3",
            publicAddress: "0x1234567890123456789012345678901234567890",
            name: "Bob Jones",
            email: "bob@example.com",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
          assignedAt: "2024-01-01T00:00:00Z",
        },
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockApiResponse });

      const result = await milestoneReviewersService.addReviewer("program-1", 1, reviewerData);

      expect(result.telegram).toBeUndefined();
    });
  });

  describe("removeReviewer", () => {
    it("should remove a milestone reviewer successfully", async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await milestoneReviewersService.removeReviewer(
        "program-1",
        1,
        "0x1234567890123456789012345678901234567890"
      );

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        "/v2/programs/program-1/1/milestone-reviewers/0x1234567890123456789012345678901234567890"
      );
    });

    it("should handle deletion errors", async () => {
      const mockError = new Error("Reviewer not found");
      mockAxiosInstance.delete.mockRejectedValue(mockError);

      await expect(
        milestoneReviewersService.removeReviewer(
          "program-1",
          1,
          "0x1234567890123456789012345678901234567890"
        )
      ).rejects.toThrow("Reviewer not found");
    });
  });

  describe("addMultipleReviewers", () => {
    it("should add multiple reviewers successfully", async () => {
      const reviewers: AddMilestoneReviewerRequest[] = [
        {
          publicAddress: "0x1234567890123456789012345678901234567890",
          name: "Reviewer 1",
          email: "reviewer1@example.com",
        },
        {
          publicAddress: "0x0987654321098765432109876543210987654321",
          name: "Reviewer 2",
          email: "reviewer2@example.com",
        },
      ];

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          reviewer: {
            publicAddress: "0x1234567890123456789012345678901234567890",
            programId: "program-1",
            chainID: 1,
            userProfile: {
              id: "user-1",
              publicAddress: "0x1234567890123456789012345678901234567890",
              name: "Reviewer 1",
              email: "reviewer1@example.com",
              createdAt: "2024-01-01T00:00:00Z",
              updatedAt: "2024-01-01T00:00:00Z",
            },
            assignedAt: "2024-01-01T00:00:00Z",
          },
        },
      });

      const result = await milestoneReviewersService.addMultipleReviewers(
        "program-1",
        1,
        reviewers
      );

      expect(result.added).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle partial failures when adding multiple reviewers", async () => {
      const reviewers: AddMilestoneReviewerRequest[] = [
        {
          publicAddress: "0x1234567890123456789012345678901234567890",
          name: "Reviewer 1",
          email: "reviewer1@example.com",
        },
        {
          publicAddress: "0x0987654321098765432109876543210987654321",
          name: "Reviewer 2",
          email: "invalid-email",
        },
      ];

      // Mock axios.isAxiosError for this test
      mockedAxios.isAxiosError = jest.fn(
        (payload: any): payload is import("axios").AxiosError => true
      ) as unknown as typeof mockedAxios.isAxiosError;

      mockAxiosInstance.post
        .mockResolvedValueOnce({
          data: {
            reviewer: {
              publicAddress: "0x1234567890123456789012345678901234567890",
              programId: "program-1",
              chainID: 1,
              userProfile: {
                id: "user-1",
                publicAddress: "0x1234567890123456789012345678901234567890",
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
              message: "Invalid email format",
            },
          },
        });

      const result = await milestoneReviewersService.addMultipleReviewers(
        "program-1",
        1,
        reviewers
      );

      expect(result.added).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe("Invalid email format");
    });

    it("should handle axios errors in batch operations", async () => {
      const reviewers: AddMilestoneReviewerRequest[] = [
        {
          publicAddress: "0x1234567890123456789012345678901234567890",
          name: "Reviewer 1",
          email: "reviewer1@example.com",
        },
      ];

      const axiosError = {
        isAxiosError: true,
        response: {
          data: {
            message: "Duplicate reviewer",
          },
        },
        message: "Request failed",
      };

      mockedAxios.isAxiosError = jest.fn(
        (payload: any): payload is import("axios").AxiosError => true
      ) as unknown as typeof mockedAxios.isAxiosError;
      mockAxiosInstance.post.mockRejectedValue(axiosError);

      const result = await milestoneReviewersService.addMultipleReviewers(
        "program-1",
        1,
        reviewers
      );

      expect(result.added).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe("Duplicate reviewer");
    });

    it("should handle non-axios errors", async () => {
      const reviewers: AddMilestoneReviewerRequest[] = [
        {
          publicAddress: "0x1234567890123456789012345678901234567890",
          name: "Reviewer 1",
          email: "reviewer1@example.com",
        },
      ];

      const error = new Error("Network error");
      mockedAxios.isAxiosError = jest.fn(
        (payload: any): payload is import("axios").AxiosError => false
      ) as unknown as typeof mockedAxios.isAxiosError;
      mockAxiosInstance.post.mockRejectedValue(error);

      const result = await milestoneReviewersService.addMultipleReviewers(
        "program-1",
        1,
        reviewers
      );

      expect(result.errors[0].error).toBe("Network error");
    });

    it("should handle string errors", async () => {
      const reviewers: AddMilestoneReviewerRequest[] = [
        {
          publicAddress: "0x1234567890123456789012345678901234567890",
          name: "Reviewer 1",
          email: "reviewer1@example.com",
        },
      ];

      mockAxiosInstance.post.mockRejectedValue("String error");

      const result = await milestoneReviewersService.addMultipleReviewers(
        "program-1",
        1,
        reviewers
      );

      expect(result.errors[0].error).toBe("String error");
    });
  });

  describe("validateReviewerData", () => {
    it("should validate correct reviewer data", () => {
      const data: AddMilestoneReviewerRequest = {
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "John Doe",
        email: "john@example.com",
        telegram: "@johndoe",
      };

      const result = milestoneReviewersService.validateReviewerData(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid wallet address", () => {
      const data: AddMilestoneReviewerRequest = {
        publicAddress: "invalid-address",
        name: "John Doe",
        email: "john@example.com",
      };

      const result = milestoneReviewersService.validateReviewerData(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid wallet address format");
    });

    it("should reject missing required fields", () => {
      const data: AddMilestoneReviewerRequest = {
        publicAddress: "",
        name: "",
        email: "",
      };

      const result = milestoneReviewersService.validateReviewerData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should accept valid data without telegram", () => {
      const data: AddMilestoneReviewerRequest = {
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "John Doe",
        email: "john@example.com",
      };

      const result = milestoneReviewersService.validateReviewerData(data);

      expect(result.valid).toBe(true);
    });

    it("should reject invalid telegram handle", () => {
      const data: AddMilestoneReviewerRequest = {
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "John Doe",
        email: "john@example.com",
        telegram: "ab",
      };

      const result = milestoneReviewersService.validateReviewerData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Telegram"))).toBe(true);
    });
  });
});
