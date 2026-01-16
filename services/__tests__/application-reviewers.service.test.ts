import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { AssignApplicationReviewersRequest } from "../application-reviewers.service";
import { applicationReviewersService } from "../application-reviewers.service";

// Mock fetchData for GET and PUT requests
jest.mock("@/utilities/fetchData");

jest.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));

// Import fetchData mock to access it in tests
import fetchData from "@/utilities/fetchData";

const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;

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
      mockFetchData.mockResolvedValue([
        { message: "Reviewers assigned successfully" },
        null,
        null,
        200,
      ]);

      await applicationReviewersService.assignReviewers(applicationId, mockRequest);

      expect(mockFetchData).toHaveBeenCalledWith(
        `/v2/funding-applications/${applicationId}/reviewers`,
        "PUT",
        mockRequest,
        {},
        {},
        true
      );
      expect(mockFetchData).toHaveBeenCalledTimes(1);
    });

    it("should handle assigning only app reviewers", async () => {
      const request: AssignApplicationReviewersRequest = {
        appReviewerAddresses: ["0x1234567890123456789012345678901234567890"],
      };
      mockFetchData.mockResolvedValue([{ message: "Success" }, null, null, 200]);

      await applicationReviewersService.assignReviewers(applicationId, request);

      expect(mockFetchData).toHaveBeenCalledWith(
        `/v2/funding-applications/${applicationId}/reviewers`,
        "PUT",
        request,
        {},
        {},
        true
      );
    });

    it("should handle assigning only milestone reviewers", async () => {
      const request: AssignApplicationReviewersRequest = {
        milestoneReviewerAddresses: ["0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"],
      };
      mockFetchData.mockResolvedValue([{ message: "Success" }, null, null, 200]);

      await applicationReviewersService.assignReviewers(applicationId, request);

      expect(mockFetchData).toHaveBeenCalledWith(
        `/v2/funding-applications/${applicationId}/reviewers`,
        "PUT",
        request,
        {},
        {},
        true
      );
    });

    it("should handle empty arrays", async () => {
      const request: AssignApplicationReviewersRequest = {
        appReviewerAddresses: [],
        milestoneReviewerAddresses: [],
      };
      mockFetchData.mockResolvedValue([{ message: "Success" }, null, null, 200]);

      await applicationReviewersService.assignReviewers(applicationId, request);

      expect(mockFetchData).toHaveBeenCalledWith(
        `/v2/funding-applications/${applicationId}/reviewers`,
        "PUT",
        request,
        {},
        {},
        true
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
      mockFetchData.mockResolvedValue([{ message: "Success" }, null, null, 200]);

      await applicationReviewersService.assignReviewers(applicationId, request);

      expect(mockFetchData).toHaveBeenCalledWith(
        `/v2/funding-applications/${applicationId}/reviewers`,
        "PUT",
        request,
        {},
        {},
        true
      );
    });

    it("should throw error on API failure", async () => {
      mockFetchData.mockResolvedValue([null, "Bad Request", null, 400]);

      await expect(
        applicationReviewersService.assignReviewers(applicationId, mockRequest)
      ).rejects.toThrow("Bad Request");
    });

    it("should handle 404 error", async () => {
      mockFetchData.mockResolvedValue([null, "Application not found", null, 404]);

      await expect(
        applicationReviewersService.assignReviewers(applicationId, mockRequest)
      ).rejects.toThrow("Application not found");
    });

    it("should handle 422 validation error", async () => {
      mockFetchData.mockResolvedValue([null, "Reviewer not configured", null, 422]);

      await expect(
        applicationReviewersService.assignReviewers(applicationId, mockRequest)
      ).rejects.toThrow("Reviewer not configured");
    });

    it("should handle network errors", async () => {
      mockFetchData.mockResolvedValue([null, "Network error", null, 500]);

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
      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual(mockResponse);
      expect(mockFetchData).toHaveBeenCalledWith(
        `/v2/funding-applications/${applicationId}/reviewers`
      );
      expect(mockFetchData).toHaveBeenCalledTimes(1);
    });

    it("should return empty arrays when no reviewers assigned", async () => {
      const mockResponse = {
        appReviewers: [],
        milestoneReviewers: [],
      };
      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual(mockResponse);
    });

    it("should handle missing fields in response", async () => {
      mockFetchData.mockResolvedValue([{}, null, null, 200]);

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual({
        appReviewers: [],
        milestoneReviewers: [],
      });
    });

    it("should handle partial fields in response", async () => {
      mockFetchData.mockResolvedValue([
        {
          appReviewers: ["0x1234567890123456789012345678901234567890"],
        },
        null,
        null,
        200,
      ]);

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual({
        appReviewers: ["0x1234567890123456789012345678901234567890"],
        milestoneReviewers: [],
      });
    });

    it("should return empty arrays for 404 error", async () => {
      mockFetchData.mockResolvedValue([null, "Application Reviewers Not Found", null, 404]);

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual({
        appReviewers: [],
        milestoneReviewers: [],
      });
    });

    it("should return empty arrays when error message includes 'No reviewers found'", async () => {
      mockFetchData.mockResolvedValue([null, "No reviewers found for this application", null, 404]);

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual({
        appReviewers: [],
        milestoneReviewers: [],
      });
    });

    it("should throw error for non-404 errors", async () => {
      mockFetchData.mockResolvedValue([null, "Internal Server Error", null, 500]);

      await expect(applicationReviewersService.getAssignedReviewers(applicationId)).rejects.toThrow(
        "Internal Server Error"
      );
    });

    it("should throw error for network errors", async () => {
      mockFetchData.mockResolvedValue([null, "Network error", null, 500]);

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
      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual(mockResponse);
    });

    it("should handle different application IDs", async () => {
      const differentId = "APP-99999-ZZZZZ";
      const mockResponse = {
        appReviewers: ["0x1234567890123456789012345678901234567890"],
        milestoneReviewers: [],
      };
      mockFetchData.mockResolvedValue([mockResponse, null, null, 200]);

      const result = await applicationReviewersService.getAssignedReviewers(differentId);

      expect(result).toEqual(mockResponse);
      expect(mockFetchData).toHaveBeenCalledWith(
        `/v2/funding-applications/${differentId}/reviewers`
      );
    });
  });
});
