import axios, { type AxiosInstance } from "axios";
import { TokenManager } from "@/utilities/auth/token-manager";

// Mock dependencies BEFORE importing the service
vi.mock("axios");
vi.mock("@/utilities/auth/token-manager");
vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));

// Mock fetchData for GET requests
vi.mock("@/utilities/fetchData");

// Create a persistent mock instance using var (hoisted) so it's available in jest.mock factory
var mockAxiosInstance: vi.Mocked<AxiosInstance>;

// Mock api-client for mutations (POST, DELETE)
vi.mock("@/utilities/auth/api-client", () => {
  const instance = {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    request: vi.fn(),
    head: vi.fn(),
    options: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
    },
    defaults: {} as any,
    getUri: vi.fn(),
    deleteUri: vi.fn(),
  } as unknown as vi.Mocked<AxiosInstance>;

  mockAxiosInstance = instance;

  return {
    createAuthenticatedApiClient: vi.fn(() => instance),
  };
});

// Import the service AFTER all mocks are set up
import {
  type AddReviewerRequest,
  programReviewersService,
} from "@/services/program-reviewers.service";
// Import fetchData mock
import fetchData from "@/utilities/fetchData";

const mockedAxios = axios as vi.Mocked<typeof axios>;
const mockFetchData = fetchData as vi.MockedFunction<typeof fetchData>;

describe("programReviewersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance.post.mockClear();
    mockAxiosInstance.delete.mockClear();

    (TokenManager.getToken as vi.Mock) = vi.fn().mockResolvedValue("test-token");
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

      mockAxiosInstance.post.mockResolvedValue({ data: mockApiResponse });

      const result = await programReviewersService.addReviewer("program-1", reviewerData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining("program-1"),
        reviewerData
      );
      expect(result.name).toBe("Bob Reviewer");
      expect(result.email).toBe("bob@example.com");
    });

    it("should handle response without reviewer data", async () => {
      const reviewerData: AddReviewerRequest = {
        name: "Carol Reviewer",
        email: "carol@example.com",
      };

      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      const result = await programReviewersService.addReviewer("program-1", reviewerData);

      expect(result.name).toBe(reviewerData.name);
      expect(result.email).toBe(reviewerData.email);
      expect(result.assignedAt).toBeDefined();
    });
  });

  describe("removeReviewer", () => {
    it("should remove a program reviewer by email successfully", async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await programReviewersService.removeReviewer("program-1", "alice@example.com");

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        "/v2/funding-program-configs/program-1/reviewers/by-email",
        { data: { email: "alice@example.com" } }
      );
    });
  });

  describe("addMultipleReviewers", () => {
    it("should add multiple reviewers successfully", async () => {
      const reviewers: AddReviewerRequest[] = [
        {
          name: "Reviewer 1",
          email: "reviewer1@example.com",
        },
        {
          name: "Reviewer 2",
          email: "reviewer2@example.com",
        },
      ];

      mockAxiosInstance.post.mockResolvedValue({
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
          name: "Reviewer 1",
          email: "reviewer1@example.com",
        },
        {
          name: "Reviewer 2",
          email: "reviewer2@example.com",
        },
      ];

      // Mock axios.isAxiosError for this test
      mockedAxios.isAxiosError = vi.fn(
        (payload: any): payload is import("axios").AxiosError => true
      ) as unknown as typeof mockedAxios.isAxiosError;

      mockAxiosInstance.post
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
        name: "",
        email: "invalid-email",
      };

      const result = programReviewersService.validateReviewerData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
