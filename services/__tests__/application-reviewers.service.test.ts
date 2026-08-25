import type { AssignApplicationReviewersRequest } from "../application-reviewers.service";
import { applicationReviewersService } from "../application-reviewers.service";

// Mock the typed api client for GET and PUT requests
vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));

// Import api mock to access it in tests
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";

const mockApiGet = api.get as vi.MockedFunction<typeof api.get>;
const mockApiPut = api.put as vi.MockedFunction<typeof api.put>;

describe("applicationReviewersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("assignReviewers", () => {
    const applicationId = "APP-12345-ABCDE";
    const mockRequest: AssignApplicationReviewersRequest = {
      appReviewerAddresses: ["0x1234567890123456789012345678901234567890"],
      milestoneReviewerAddresses: ["0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"],
    };

    it("should assign reviewers successfully", async () => {
      mockApiPut.mockResolvedValue({ message: "Reviewers assigned successfully" });

      await applicationReviewersService.assignReviewers(applicationId, mockRequest);

      expect(mockApiPut).toHaveBeenCalledWith(
        `/v2/funding-applications/${applicationId}/reviewers`,
        mockRequest
      );
      expect(mockApiPut).toHaveBeenCalledTimes(1);
    });

    it("should handle assigning only app reviewers", async () => {
      const request: AssignApplicationReviewersRequest = {
        appReviewerAddresses: ["0x1234567890123456789012345678901234567890"],
      };
      mockApiPut.mockResolvedValue({ message: "Success" });

      await applicationReviewersService.assignReviewers(applicationId, request);

      expect(mockApiPut).toHaveBeenCalledWith(
        `/v2/funding-applications/${applicationId}/reviewers`,
        request
      );
    });

    it("should handle assigning only milestone reviewers", async () => {
      const request: AssignApplicationReviewersRequest = {
        milestoneReviewerAddresses: ["0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"],
      };
      mockApiPut.mockResolvedValue({ message: "Success" });

      await applicationReviewersService.assignReviewers(applicationId, request);

      expect(mockApiPut).toHaveBeenCalledWith(
        `/v2/funding-applications/${applicationId}/reviewers`,
        request
      );
    });

    it("should handle empty arrays", async () => {
      const request: AssignApplicationReviewersRequest = {
        appReviewerAddresses: [],
        milestoneReviewerAddresses: [],
      };
      mockApiPut.mockResolvedValue({ message: "Success" });

      await applicationReviewersService.assignReviewers(applicationId, request);

      expect(mockApiPut).toHaveBeenCalledWith(
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
      mockApiPut.mockResolvedValue({ message: "Success" });

      await applicationReviewersService.assignReviewers(applicationId, request);

      expect(mockApiPut).toHaveBeenCalledWith(
        `/v2/funding-applications/${applicationId}/reviewers`,
        request
      );
    });

    it("should throw error on API failure", async () => {
      mockApiPut.mockRejectedValue(
        new HttpError(400, {
          endpoint: `/v2/funding-applications/${applicationId}/reviewers`,
          method: "PUT",
          body: { message: "Bad Request" },
        })
      );

      await expect(
        applicationReviewersService.assignReviewers(applicationId, mockRequest)
      ).rejects.toThrow("Bad Request");
    });

    it("should handle 404 error", async () => {
      mockApiPut.mockRejectedValue(
        new HttpError(404, {
          endpoint: `/v2/funding-applications/${applicationId}/reviewers`,
          method: "PUT",
          body: { message: "Application not found" },
        })
      );

      await expect(
        applicationReviewersService.assignReviewers(applicationId, mockRequest)
      ).rejects.toThrow("Application not found");
    });

    it("should handle 422 validation error", async () => {
      mockApiPut.mockRejectedValue(
        new HttpError(422, {
          endpoint: `/v2/funding-applications/${applicationId}/reviewers`,
          method: "PUT",
          body: { message: "Reviewer not configured" },
        })
      );

      await expect(
        applicationReviewersService.assignReviewers(applicationId, mockRequest)
      ).rejects.toThrow("Reviewer not configured");
    });

    it("should handle network errors", async () => {
      mockApiPut.mockRejectedValue(
        new HttpError(500, {
          endpoint: `/v2/funding-applications/${applicationId}/reviewers`,
          method: "PUT",
          body: { message: "Network error" },
        })
      );

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
      mockApiGet.mockResolvedValue(mockResponse);

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual(mockResponse);
      expect(mockApiGet).toHaveBeenCalledWith(
        `/v2/funding-applications/${applicationId}/reviewers`,
        expect.anything()
      );
      expect(mockApiGet).toHaveBeenCalledTimes(1);
    });

    it("should return empty arrays when no reviewers assigned", async () => {
      const mockResponse = {
        appReviewers: [],
        milestoneReviewers: [],
      };
      mockApiGet.mockResolvedValue(mockResponse);

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual(mockResponse);
    });

    it("should handle missing fields in response", async () => {
      mockApiGet.mockResolvedValue({});

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual({
        appReviewers: [],
        milestoneReviewers: [],
      });
    });

    it("should handle partial fields in response", async () => {
      mockApiGet.mockResolvedValue({
        appReviewers: ["0x1234567890123456789012345678901234567890"],
      });

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual({
        appReviewers: ["0x1234567890123456789012345678901234567890"],
        milestoneReviewers: [],
      });
    });

    it("should return empty arrays for 404 error", async () => {
      mockApiGet.mockRejectedValue(
        new HttpError(404, {
          endpoint: `/v2/funding-applications/${applicationId}/reviewers`,
          method: "GET",
          body: { message: "Application Reviewers Not Found" },
        })
      );

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual({
        appReviewers: [],
        milestoneReviewers: [],
      });
    });

    it("should return empty arrays when error message includes 'No reviewers found'", async () => {
      mockApiGet.mockRejectedValue(
        new HttpError(404, {
          endpoint: `/v2/funding-applications/${applicationId}/reviewers`,
          method: "GET",
          body: { message: "No reviewers found for this application" },
        })
      );

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual({
        appReviewers: [],
        milestoneReviewers: [],
      });
    });

    it("should throw error for non-404 errors", async () => {
      mockApiGet.mockRejectedValue(
        new HttpError(500, {
          endpoint: `/v2/funding-applications/${applicationId}/reviewers`,
          method: "GET",
          body: { message: "Internal Server Error" },
        })
      );

      await expect(applicationReviewersService.getAssignedReviewers(applicationId)).rejects.toThrow(
        "Internal Server Error"
      );
    });

    it("should throw error for network errors", async () => {
      mockApiGet.mockRejectedValue(
        new HttpError(500, {
          endpoint: `/v2/funding-applications/${applicationId}/reviewers`,
          method: "GET",
          body: { message: "Network error" },
        })
      );

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
      mockApiGet.mockResolvedValue(mockResponse);

      const result = await applicationReviewersService.getAssignedReviewers(applicationId);

      expect(result).toEqual(mockResponse);
    });

    it("should handle different application IDs", async () => {
      const differentId = "APP-99999-ZZZZZ";
      const mockResponse = {
        appReviewers: ["0x1234567890123456789012345678901234567890"],
        milestoneReviewers: [],
      };
      mockApiGet.mockResolvedValue(mockResponse);

      const result = await applicationReviewersService.getAssignedReviewers(differentId);

      expect(result).toEqual(mockResponse);
      expect(mockApiGet).toHaveBeenCalledWith(
        `/v2/funding-applications/${differentId}/reviewers`,
        expect.anything()
      );
    });
  });
});
