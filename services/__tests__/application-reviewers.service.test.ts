import type { AssignApplicationReviewersRequest } from "../application-reviewers.service";
import { applicationReviewersService } from "../application-reviewers.service";

// Mock the API client factory - must be hoisted before imports
jest.mock("@/utilities/auth/api-client", () => {
  const mockGet = jest.fn();
  const mockPut = jest.fn();

  return {
    createAuthenticatedApiClient: jest.fn(() => ({
      get: mockGet,
      put: mockPut,
      interceptors: {
        response: {
          use: jest.fn((onFulfilled, onRejected) => {
            // Store interceptors for testing if needed
          }),
        },
      },
    })),
    // Export mocks for test access
    __mockGet: mockGet,
    __mockPut: mockPut,
  };
});

jest.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));

const { __mockGet: mockGet, __mockPut: mockPut } = jest.requireMock("@/utilities/auth/api-client");

describe("applicationReviewersService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("assignReviewers", () => {
    const applicationId = "APP-12345-ABCDE";
    const mockRequest: AssignApplicationReviewersRequest = {
      appReviewerAddresses: ["0x1234567890123456789012345678901234567890"],
      milestoneReviewerAddresses: ["0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"],
    };

    it("should assign reviewers successfully", async () => {
      mockPut.mockResolvedValue({ data: { message: "Reviewers assigned successfully" } });

      await applicationReviewersService.assignReviewers(applicationId, mockRequest);

      expect(mockPut).toHaveBeenCalledWith(
        `/v2/funding-applications/${applicationId}/reviewers`,
        mockRequest
      );
      expect(mockPut).toHaveBeenCalledTimes(1);
    });

    it("should handle assigning only app reviewers", async () => {
      const request: AssignApplicationReviewersRequest = {
        appReviewerAddresses: ["0x1234567890123456789012345678901234567890"],
      };
      mockPut.mockResolvedValue({ data: { message: "Success" } });

      await applicationReviewersService.assignReviewers(applicationId, request);

      expect(mockPut).toHaveBeenCalledWith(
        `/v2/funding-applications/${applicationId}/reviewers`,
        request
      );
    });

    it("should handle assigning only milestone reviewers", async () => {
      const request: AssignApplicationReviewersRequest = {
        milestoneReviewerAddresses: ["0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"],
      };
      mockPut.mockResolvedValue({ data: { message: "Success" } });

      await applicationReviewersService.assignReviewers(applicationId, request);

      expect(mockPut).toHaveBeenCalledWith(
        `/v2/funding-applications/${applicationId}/reviewers`,
        request
      );
    });

    it("should handle empty arrays", async () => {
      const request: AssignApplicationReviewersRequest = {
        appReviewerAddresses: [],
        milestoneReviewerAddresses: [],
      };
      mockPut.mockResolvedValue({ data: { message: "Success" } });

      await applicationReviewersService.assignReviewers(applicationId, request);

      expect(mockPut).toHaveBeenCalledWith(
        `/v2/funding-applications/${applicationId}/reviewers`,
        request
      );
    });

    it("should handle multiple reviewers", async () => {
      const request: AssignApplicationReviewersRequest = {
        appReviewerAddresses: [
          "0x1111111111111111111111111111111111111111",
          "0x2222222222222222222222222222222222222222",
        ],
        milestoneReviewerAddresses: [
          "0x3333333333333333333333333333333333333333",
          "0x4444444444444444444444444444444444444444",
        ],
      };
      mockPut.mockResolvedValue({ data: { message: "Success" } });

      await applicationReviewersService.assignReviewers(applicationId, request);

      expect(mockPut).toHaveBeenCalledWith(
        `/v2/funding-applications/${applicationId}/reviewers`,
        request
      );
    });

    it("should throw error on API failure", async () => {
      const error = {
        response: { status: 400, data: { message: "Bad Request" } },
        message: "API Error",
      };
      mockPut.mockRejectedValue(error);

      await expect(
        applicationReviewersService.assignReviewers(applicationId, mockRequest)
      ).rejects.toEqual(error);
    });

    it("should handle 404 error", async () => {
      const error = {
        response: { status: 404, data: { message: "Application not found" } },
        message: "Not Found",
      };
      mockPut.mockRejectedValue(error);

      await expect(
        applicationReviewersService.assignReviewers(applicationId, mockRequest)
      ).rejects.toEqual(error);
    });

    it("should handle 422 validation error", async () => {
      const error = {
        response: {
          status: 422,
          data: {
            error: "Invalid Reviewer Assignment",
            message: "Reviewer not configured",
            details: [
              {
                field: "appReviewerAddresses[0]",
                message: "Reviewer 0x1234...abcd is not configured",
              },
            ],
          },
        },
        message: "Validation Error",
      };
      mockPut.mockRejectedValue(error);

      await expect(
        applicationReviewersService.assignReviewers(applicationId, mockRequest)
      ).rejects.toEqual(error);
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network error");
      mockPut.mockRejectedValue(networkError);

      await expect(
        applicationReviewersService.assignReviewers(applicationId, mockRequest)
      ).rejects.toThrow("Network error");
    });
  });

  describe("getAssignedReviewers", () => {
    const applicationId = "APP-12345-ABCDE";

    it("should fetch assigned reviewers successfully", async () => {
      const mockResponse = {
        appReviewers: ["0x1234567890123456789012345678901234567890"],
        milestoneReviewers: ["0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"],
      };
      mockGet.mockResolvedValue({ data: mockResponse });

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual(mockResponse);
      expect(mockGet).toHaveBeenCalledWith(`/v2/funding-applications/${applicationId}/reviewers`);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it("should return empty arrays when no reviewers assigned", async () => {
      const mockResponse = {
        appReviewers: [],
        milestoneReviewers: [],
      };
      mockGet.mockResolvedValue({ data: mockResponse });

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual(mockResponse);
    });

    it("should handle missing fields in response", async () => {
      mockGet.mockResolvedValue({ data: {} });

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual({
        appReviewers: [],
        milestoneReviewers: [],
      });
    });

    it("should handle partial fields in response", async () => {
      mockGet.mockResolvedValue({
        data: {
          appReviewers: ["0x1234567890123456789012345678901234567890"],
        },
      });

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual({
        appReviewers: ["0x1234567890123456789012345678901234567890"],
        milestoneReviewers: [],
      });
    });

    it("should return empty arrays for 404 error", async () => {
      mockGet.mockRejectedValue({
        response: {
          status: 404,
          data: {
            error: "Application Reviewers Not Found",
            message: "No reviewers found",
          },
        },
      });

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual({
        appReviewers: [],
        milestoneReviewers: [],
      });
    });

    it("should return empty arrays when error message includes 'No reviewers found'", async () => {
      mockGet.mockRejectedValue({
        response: {
          status: 200,
          data: {
            error: "Application Reviewers Not Found",
            message: "No reviewers found for this application",
          },
        },
      });

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual({
        appReviewers: [],
        milestoneReviewers: [],
      });
    });

    it("should throw error for non-404 errors", async () => {
      const error = {
        response: {
          status: 500,
          data: { message: "Internal Server Error" },
        },
        message: "Server error",
      };
      mockGet.mockRejectedValue(error);

      await expect(applicationReviewersService.getAssignedReviewers(applicationId)).rejects.toEqual(
        error
      );
    });

    it("should throw error for network errors", async () => {
      const networkError = new Error("Network error");
      mockGet.mockRejectedValue(networkError);

      await expect(applicationReviewersService.getAssignedReviewers(applicationId)).rejects.toThrow(
        "Network error"
      );
    });

    it("should handle multiple reviewers", async () => {
      const mockResponse = {
        appReviewers: [
          "0x1111111111111111111111111111111111111111",
          "0x2222222222222222222222222222222222222222",
        ],
        milestoneReviewers: [
          "0x3333333333333333333333333333333333333333",
          "0x4444444444444444444444444444444444444444",
        ],
      };
      mockGet.mockResolvedValue({ data: mockResponse });

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual(mockResponse);
    });

    it("should handle different application IDs", async () => {
      const differentId = "APP-99999-ZZZZZ";
      const mockResponse = {
        appReviewers: ["0x1234567890123456789012345678901234567890"],
        milestoneReviewers: [],
      };
      mockGet.mockResolvedValue({ data: mockResponse });

      const result = await applicationReviewersService.getAssignedReviewers(differentId);

      expect(result).toEqual(mockResponse);
      expect(mockGet).toHaveBeenCalledWith(`/v2/funding-applications/${differentId}/reviewers`);
    });
  });
});
