import type { AxiosInstance } from "axios";
import type {
  IApplicationStatistics,
  IApplicationStatusUpdateRequest,
  IApplicationSubmitRequest,
  IApplicationUpdateRequest,
  IFormSchema,
  IFundingApplication,
  IFundingProgramConfig,
  IPaginatedApplicationsResponse,
} from "@/types/funding-platform";

// Mock fetchData for GET requests (most queries now use fetchData)
jest.mock("@/utilities/fetchData");

jest.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));

// Create a persistent mock instance using var (hoisted) so it's available in jest.mock factory
var mockAxiosInstance: jest.Mocked<AxiosInstance>;

// Mock api-client for mutations (POST, PUT, DELETE)
jest.mock("@/utilities/auth/api-client", () => {
  const mockGet = jest.fn();
  const mockPost = jest.fn();
  const mockPut = jest.fn();
  const mockDelete = jest.fn();

  const instance = {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };

  mockAxiosInstance = instance as unknown as jest.Mocked<AxiosInstance>;

  return {
    createAuthenticatedApiClient: jest.fn(() => instance),
    __mockGet: mockGet,
    __mockPost: mockPost,
    __mockPut: mockPut,
    __mockDelete: mockDelete,
  };
});

// Import fetchData mock to access it in tests
import fetchData from "@/utilities/fetchData";

// Import service and mock utilities after mocks are configured
import {
  fundingApplicationsAPI,
  fundingPlatformService,
  fundingProgramsAPI,
} from "../fundingPlatformService";

const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;

const {
  __mockGet: mockGet,
  __mockPost: mockPost,
  __mockPut: mockPut,
  __mockDelete: mockDelete,
} = jest.requireMock("@/utilities/auth/api-client");

describe("fundingPlatformService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("fundingProgramsAPI", () => {
    const mockProgram: IFundingProgramConfig = {
      id: "program-123",
      programId: "program-123",
      chainID: 1,
      formSchema: {
        fields: [],
      },
      isEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    describe("getProgramsByCommunity", () => {
      it("should fetch programs for a community successfully", async () => {
        const mockPrograms = [mockProgram];
        mockFetchData.mockResolvedValue([mockPrograms, null, null, 200]);

        const result = await fundingProgramsAPI.getProgramsByCommunity("community-123");

        expect(result).toEqual(mockPrograms);
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("community-123"));
      });

      it("should handle API errors", async () => {
        mockFetchData.mockResolvedValue([null, "Not found", null, 404]);

        await expect(
          fundingProgramsAPI.getProgramsByCommunity("invalid-community")
        ).rejects.toThrow("Not found");
        expect(console.error).toHaveBeenCalledWith("API Error:", "Not found");
      });

      it("should handle programs with existing metrics", async () => {
        const programWithMetrics = {
          ...mockProgram,
          metrics: {
            totalApplications: 10,
            pendingApplications: 5,
            approvedApplications: 3,
            rejectedApplications: 2,
          },
        };
        mockFetchData.mockResolvedValue([[programWithMetrics], null, null, 200]);

        const result = await fundingProgramsAPI.getProgramsByCommunity("community-123");

        expect(result).toEqual([programWithMetrics]);
      });
    });

    describe("getProgramConfiguration", () => {
      it("should fetch program configuration successfully", async () => {
        mockFetchData.mockResolvedValue([mockProgram, null, null, 200]);

        const result = await fundingProgramsAPI.getProgramConfiguration("program-123", 1);

        expect(result).toEqual(mockProgram);
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("program-123"));
      });

      it("should return null when no data is returned", async () => {
        mockFetchData.mockResolvedValue([null, null, null, 200]);

        const result = await fundingProgramsAPI.getProgramConfiguration("nonexistent", 1);

        expect(result).toBeNull();
      });

      it("should throw error on API errors", async () => {
        mockFetchData.mockResolvedValue([null, "Not found", null, 404]);

        await expect(fundingProgramsAPI.getProgramConfiguration("nonexistent", 1)).rejects.toThrow(
          "Not found"
        );
      });
    });

    describe("getAllProgramConfigs", () => {
      it("should fetch all program configs without community filter", async () => {
        mockFetchData.mockResolvedValue([[mockProgram], null, null, 200]);

        const result = await fundingProgramsAPI.getAllProgramConfigs();

        expect(result).toEqual([mockProgram]);
        expect(mockFetchData).toHaveBeenCalledWith(
          expect.stringContaining("funding-program-configs")
        );
      });

      it("should fetch program configs with community filter", async () => {
        mockFetchData.mockResolvedValue([[mockProgram], null, null, 200]);

        const result = await fundingProgramsAPI.getAllProgramConfigs("community-123");

        expect(result).toEqual([mockProgram]);
        expect(mockFetchData).toHaveBeenCalledWith(
          expect.stringContaining("community=community-123")
        );
      });
    });

    describe("getEnabledPrograms", () => {
      it("should fetch enabled programs", async () => {
        mockFetchData.mockResolvedValue([[mockProgram], null, null, 200]);

        const result = await fundingProgramsAPI.getEnabledPrograms();

        expect(result).toEqual([mockProgram]);
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("enabled"));
      });
    });

    describe("createProgramConfiguration", () => {
      it("should create program configuration", async () => {
        mockPost.mockResolvedValue({ data: mockProgram });

        const result = await fundingProgramsAPI.createProgramConfiguration(
          "program-123",
          mockProgram
        );

        expect(result).toEqual(mockProgram);
        expect(mockPost).toHaveBeenCalledWith(
          "/v2/funding-program-configs/program-123",
          mockProgram
        );
      });
    });

    describe("updateProgramConfiguration", () => {
      it("should update program configuration", async () => {
        const updatedProgram = { ...mockProgram, isEnabled: false };
        mockPut.mockResolvedValue({ data: updatedProgram });

        const result = await fundingProgramsAPI.updateProgramConfiguration(
          "program-123",
          updatedProgram
        );

        expect(result).toEqual(updatedProgram);
        expect(mockPut).toHaveBeenCalledWith(
          "/v2/funding-program-configs/program-123",
          updatedProgram
        );
      });
    });

    describe("updateFormSchema", () => {
      const mockFormSchema: IFormSchema = {
        fields: [
          {
            id: "field-1",
            type: "text",
            label: "Project Name",
            required: true,
          },
        ],
      };

      it("should update form schema when config exists", async () => {
        mockFetchData.mockResolvedValue([mockProgram, null, null, 200]);
        mockPut.mockResolvedValue({
          data: { ...mockProgram, formSchema: mockFormSchema },
        });

        const result = await fundingProgramsAPI.updateFormSchema("program-123", mockFormSchema);

        expect(result.formSchema).toEqual(mockFormSchema);
        expect(mockPut).toHaveBeenCalledWith(
          "/v2/funding-program-configs/program-123",
          expect.objectContaining({ formSchema: mockFormSchema })
        );
      });

      it("should create new config with formSchema when config does not exist", async () => {
        mockFetchData.mockResolvedValue([null, "Not found", null, 404]);
        mockPut.mockResolvedValue({
          data: { ...mockProgram, formSchema: mockFormSchema },
        });

        const result = await fundingProgramsAPI.updateFormSchema("program-123", mockFormSchema);

        expect(result.formSchema).toEqual(mockFormSchema);
        expect(mockPut).toHaveBeenCalledWith("/v2/funding-program-configs/program-123", {
          formSchema: mockFormSchema,
        });
      });

      it("should throw error for non-404 errors", async () => {
        const error = new Error("Server error");
        (error as any).response = { status: 500 };
        mockFetchData.mockRejectedValue(error);

        await expect(
          fundingProgramsAPI.updateFormSchema("program-123", mockFormSchema)
        ).rejects.toThrow("Server error");
      });
    });

    describe("toggleProgramStatus", () => {
      it("should toggle program status when config exists", async () => {
        mockFetchData.mockResolvedValue([mockProgram, null, null, 200]);
        mockPut.mockResolvedValue({ data: { ...mockProgram, isEnabled: false } });

        const result = await fundingProgramsAPI.toggleProgramStatus("program-123", false);

        expect(result.isEnabled).toBe(false);
        expect(mockPut).toHaveBeenCalledWith(
          "/v2/funding-program-configs/program-123",
          expect.objectContaining({ isEnabled: false })
        );
      });

      it("should create new config with enabled status when config does not exist", async () => {
        mockFetchData.mockResolvedValue([null, "Not found", null, 404]);
        mockPut.mockResolvedValue({ data: { ...mockProgram, isEnabled: true } });

        const result = await fundingProgramsAPI.toggleProgramStatus("program-123", true);

        expect(result.isEnabled).toBe(true);
        expect(mockPut).toHaveBeenCalledWith("/v2/funding-program-configs/program-123", {
          isEnabled: true,
        });
      });

      it("should throw error for non-404 errors", async () => {
        const error = new Error("Server error");
        (error as any).response = { status: 500 };
        mockFetchData.mockRejectedValue(error);

        await expect(fundingProgramsAPI.toggleProgramStatus("program-123", true)).rejects.toThrow(
          "Server error"
        );
      });
    });

    describe("getProgramStats", () => {
      const mockStats: IApplicationStatistics = {
        totalApplications: 10,
        pendingApplications: 5,
        approvedApplications: 3,
        rejectedApplications: 2,
        revisionRequestedApplications: 0,
        underReviewApplications: 0,
      };

      it("should fetch program statistics successfully", async () => {
        mockFetchData.mockResolvedValue([mockStats, null, null, 200]);

        const result = await fundingProgramsAPI.getProgramStats("program-123", 1);

        expect(result).toEqual(mockStats);
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("statistics"));
      });

      it("should return default stats on error", async () => {
        mockFetchData.mockResolvedValue([null, "Failed to fetch stats", null, 500]);

        const result = await fundingProgramsAPI.getProgramStats("program-123", 1);

        expect(result).toEqual({
          totalApplications: 0,
          pendingApplications: 0,
          approvedApplications: 0,
          rejectedApplications: 0,
          revisionRequestedApplications: 0,
          underReviewApplications: 0,
        });
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining("Failed to fetch stats"),
          expect.any(Error)
        );
      });
    });
  });

  describe("fundingApplicationsAPI", () => {
    const mockApplication: IFundingApplication = {
      id: "app-123",
      projectUID: "project-456",
      programId: "program-789",
      chainID: 1,
      applicantEmail: "test@example.com",
      applicationData: {},
      referenceNumber: "APP-12345-67890",
      status: "pending",
      statusHistory: [],
      submissionIP: "127.0.0.1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    describe("submitApplication", () => {
      const submitRequest: IApplicationSubmitRequest = {
        programId: "program-123",
        applicantEmail: "test@example.com",
        applicationData: {},
      };

      it("should submit application successfully", async () => {
        mockPost.mockResolvedValue({ data: mockApplication });

        const result = await fundingApplicationsAPI.submitApplication(submitRequest);

        expect(result).toEqual(mockApplication);
        expect(mockPost).toHaveBeenCalledWith(
          "/v2/funding-applications/program-123",
          submitRequest
        );
      });

      it("should handle validation errors", async () => {
        const error = {
          response: {
            status: 400,
            data: { message: "Invalid application data" },
          },
        };
        mockPost.mockRejectedValue(error);

        await expect(fundingApplicationsAPI.submitApplication(submitRequest)).rejects.toEqual(
          error
        );
      });

      it("should handle unauthorized access", async () => {
        const error = {
          response: {
            status: 401,
            data: { message: "Unauthorized" },
          },
        };
        mockPost.mockRejectedValue(error);

        await expect(fundingApplicationsAPI.submitApplication(submitRequest)).rejects.toEqual(
          error
        );
      });
    });

    describe("updateApplication", () => {
      const updateRequest: IApplicationUpdateRequest = {
        applicationData: { projectName: "Updated Name" },
      };

      it("should update application successfully", async () => {
        const updatedApp = { ...mockApplication, ...updateRequest };
        mockPut.mockResolvedValue({ data: updatedApp });

        const result = await fundingApplicationsAPI.updateApplication("app-123", updateRequest);

        expect(result).toEqual(updatedApp);
        expect(mockPut).toHaveBeenCalledWith("/v2/funding-applications/app-123", updateRequest);
      });

      it("should handle malformed application data", async () => {
        const error = {
          response: {
            status: 400,
            data: { message: "Invalid data format" },
          },
        };
        mockPut.mockRejectedValue(error);

        await expect(
          fundingApplicationsAPI.updateApplication("app-123", updateRequest)
        ).rejects.toEqual(error);
      });
    });

    describe("updateApplicationStatus", () => {
      const statusUpdateRequest: IApplicationStatusUpdateRequest = {
        status: "approved",
        reason: "Application meets all requirements",
      };

      it("should update application status successfully", async () => {
        const updatedApp = { ...mockApplication, status: "approved" };
        mockPut.mockResolvedValue({ data: updatedApp });

        const result = await fundingApplicationsAPI.updateApplicationStatus(
          "app-123",
          statusUpdateRequest
        );

        expect(result).toEqual(updatedApp);
        expect(result.status).toBe("approved");
        expect(mockPut).toHaveBeenCalledWith(
          "/v2/funding-applications/app-123/status",
          statusUpdateRequest
        );
      });

      it("should handle status transition from pending to under_review", async () => {
        const statusUpdate: IApplicationStatusUpdateRequest = {
          status: "under_review" as const,
          reason: "Moving to review",
        };
        const updatedApp = { ...mockApplication, status: "under_review" };
        mockPut.mockResolvedValue({ data: updatedApp });

        const result = await fundingApplicationsAPI.updateApplicationStatus(
          "app-123",
          statusUpdate
        );

        expect(result.status).toBe("under_review");
      });

      it("should handle status transition to rejected with reason", async () => {
        const statusUpdate = {
          status: "rejected" as const,
          reason: "Does not meet requirements",
        };
        const updatedApp = { ...mockApplication, status: "rejected" };
        mockPut.mockResolvedValue({ data: updatedApp });

        const result = await fundingApplicationsAPI.updateApplicationStatus(
          "app-123",
          statusUpdate
        );

        expect(result.status).toBe("rejected");
      });

      it("should handle concurrent update conflicts", async () => {
        const error = {
          response: {
            status: 409,
            data: { message: "Application was modified by another user" },
          },
        };
        mockPut.mockRejectedValue(error);

        await expect(
          fundingApplicationsAPI.updateApplicationStatus("app-123", statusUpdateRequest)
        ).rejects.toEqual(error);
      });
    });

    describe("getApplicationsByProgram", () => {
      const mockPaginatedResponse: IPaginatedApplicationsResponse = {
        applications: [mockApplication],
        pagination: {
          page: 1,
          limit: 25,
          total: 1,
          totalPages: 1,
        },
      };

      it("should fetch applications with default filters", async () => {
        mockFetchData.mockResolvedValue([mockPaginatedResponse, null, null, 200]);

        const result = await fundingApplicationsAPI.getApplicationsByProgram("program-123", 1);

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("program-123"));
      });

      it("should fetch applications with status filter", async () => {
        mockFetchData.mockResolvedValue([mockPaginatedResponse, null, null, 200]);

        const result = await fundingApplicationsAPI.getApplicationsByProgram("program-123", 1, {
          status: "pending",
        });

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("status=pending"));
      });

      it("should fetch applications with pagination", async () => {
        mockFetchData.mockResolvedValue([mockPaginatedResponse, null, null, 200]);

        const result = await fundingApplicationsAPI.getApplicationsByProgram("program-123", 1, {
          page: 2,
          limit: 10,
        });

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("page=2"));
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("limit=10"));
      });

      it("should fetch applications with search filter", async () => {
        mockFetchData.mockResolvedValue([mockPaginatedResponse, null, null, 200]);

        const result = await fundingApplicationsAPI.getApplicationsByProgram("program-123", 1, {
          search: "test project",
        });

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("search="));
      });

      it("should fetch applications with date filters", async () => {
        mockFetchData.mockResolvedValue([mockPaginatedResponse, null, null, 200]);

        const result = await fundingApplicationsAPI.getApplicationsByProgram("program-123", 1, {
          dateFrom: "2024-01-01",
          dateTo: "2024-12-31",
        });

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("dateFrom=2024-01-01"));
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("dateTo=2024-12-31"));
      });

      it("should fetch applications with sorting", async () => {
        mockFetchData.mockResolvedValue([mockPaginatedResponse, null, null, 200]);

        const result = await fundingApplicationsAPI.getApplicationsByProgram("program-123", 1, {
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("sortBy=createdAt"));
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("sortOrder=desc"));
      });

      it("should handle empty applications response", async () => {
        mockFetchData.mockResolvedValue([{}, null, null, 200]);

        const result = await fundingApplicationsAPI.getApplicationsByProgram("program-123", 1);

        expect(result.applications).toEqual([]);
        expect(result.pagination).toEqual({
          page: 1,
          limit: 25,
          total: 0,
          totalPages: 0,
        });
      });

      it("should handle empty applications with custom pagination", async () => {
        mockFetchData.mockResolvedValue([{}, null, null, 200]);

        const result = await fundingApplicationsAPI.getApplicationsByProgram("program-123", 1, {
          page: 3,
          limit: 50,
        });

        expect(result.applications).toEqual([]);
        expect(result.pagination).toEqual({
          page: 3,
          limit: 50,
          total: 0,
          totalPages: 0,
        });
      });
    });

    describe("getApplication", () => {
      it("should fetch application by ID successfully", async () => {
        mockFetchData.mockResolvedValue([mockApplication, null, null, 200]);

        const result = await fundingApplicationsAPI.getApplication("app-123");

        expect(result).toEqual(mockApplication);
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("app-123"));
      });

      it("should handle 404 errors", async () => {
        mockFetchData.mockResolvedValue([null, "Not found", null, 404]);

        await expect(fundingApplicationsAPI.getApplication("nonexistent")).rejects.toThrow(
          "Not found"
        );
      });
    });

    describe("getApplicationByReference", () => {
      it("should fetch application by reference number", async () => {
        mockFetchData.mockResolvedValue([mockApplication, null, null, 200]);

        const result = await fundingApplicationsAPI.getApplicationByReference("APP-12345-67890");

        expect(result).toEqual(mockApplication);
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("APP-12345-67890"));
      });
    });

    describe("getApplicationByEmail", () => {
      it("should fetch application by email successfully", async () => {
        mockFetchData.mockResolvedValue([mockApplication, null, null, 200]);

        const result = await fundingApplicationsAPI.getApplicationByEmail(
          "program-123",
          1,
          "test@example.com"
        );

        expect(result).toEqual(mockApplication);
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("by-email"));
      });

      it("should return null for 404 errors", async () => {
        mockFetchData.mockResolvedValue([null, "404 not found", null, 404]);

        const result = await fundingApplicationsAPI.getApplicationByEmail(
          "program-123",
          1,
          "nonexistent@example.com"
        );

        expect(result).toBeNull();
      });

      it("should throw error for non-404 errors", async () => {
        mockFetchData.mockResolvedValue([null, "Server error", null, 500]);

        await expect(
          fundingApplicationsAPI.getApplicationByEmail("program-123", 1, "test@example.com")
        ).rejects.toThrow("Server error");
      });
    });

    describe("getApplicationStatistics", () => {
      const mockStats: IApplicationStatistics = {
        totalApplications: 10,
        pendingApplications: 5,
        approvedApplications: 3,
        rejectedApplications: 2,
        revisionRequestedApplications: 0,
        underReviewApplications: 0,
      };

      it("should fetch application statistics successfully", async () => {
        mockFetchData.mockResolvedValue([mockStats, null, null, 200]);

        const result = await fundingApplicationsAPI.getApplicationStatistics("program-123", 1);

        expect(result).toEqual(mockStats);
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("statistics"));
      });
    });

    describe("exportApplications", () => {
      const mockExportData = [{ ...mockApplication }];

      it("should export applications as JSON", async () => {
        mockGet.mockResolvedValue({
          data: mockExportData,
          headers: {},
        });

        const result = await fundingApplicationsAPI.exportApplications("program-123", 1, "json");

        expect(result.data).toEqual(mockExportData);
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("format=json"), {
          responseType: "json",
        });
      });

      it("should export applications as CSV", async () => {
        const mockBlob = new Blob(["csv,data"], { type: "text/csv" });
        mockGet.mockResolvedValue({
          data: mockBlob,
          headers: {
            "content-disposition": 'attachment; filename="applications.csv"',
          },
        });

        const result = await fundingApplicationsAPI.exportApplications("program-123", 1, "csv");

        expect(result.data).toEqual(mockBlob);
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("format=csv"), {
          responseType: "blob",
        });
      });

      it("should extract filename from Content-Disposition header", async () => {
        mockGet.mockResolvedValue({
          data: mockExportData,
          headers: {
            "content-disposition": 'attachment; filename="applications-2024.json"',
          },
        });

        const result = await fundingApplicationsAPI.exportApplications("program-123", 1, "json");

        expect(result.filename).toBe("applications-2024.json");
      });

      it("should handle filename with quotes", async () => {
        mockGet.mockResolvedValue({
          data: mockExportData,
          headers: {
            "content-disposition": 'attachment; filename="applications.json"',
          },
        });

        const result = await fundingApplicationsAPI.exportApplications("program-123", 1, "json");

        expect(result.filename).toBe("applications.json");
      });

      it("should export with filters", async () => {
        mockGet.mockResolvedValue({
          data: mockExportData,
          headers: {},
        });

        const result = await fundingApplicationsAPI.exportApplications("program-123", 1, "json", {
          status: "pending",
          search: "test",
        });

        expect(result.data).toEqual(mockExportData);
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("status=pending"), {
          responseType: "json",
        });
      });
    });

    describe("exportApplicationsAdmin", () => {
      const mockExportData = [{ ...mockApplication }];

      it("should export applications as admin with full data", async () => {
        mockGet.mockResolvedValue({
          data: mockExportData,
          headers: {},
        });

        const result = await fundingApplicationsAPI.exportApplicationsAdmin(
          "program-123",
          1,
          "json"
        );

        expect(result.data).toEqual(mockExportData);
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("admin"), {
          responseType: "json",
        });
      });

      it("should export as CSV with admin endpoint", async () => {
        const mockBlob = new Blob(["csv,data"], { type: "text/csv" });
        mockGet.mockResolvedValue({
          data: mockBlob,
          headers: {
            "content-disposition": 'attachment; filename="admin-export.csv"',
          },
        });

        const result = await fundingApplicationsAPI.exportApplicationsAdmin(
          "program-123",
          1,
          "csv"
        );

        expect(result.data).toEqual(mockBlob);
        expect(result.filename).toBe("admin-export.csv");
      });
    });

    describe("getApplicationVersionsTimeline", () => {
      const mockVersions = [
        {
          id: "version-1",
          applicationId: "app-123",
          version: 1,
          applicationData: {},
          createdAt: new Date().toISOString(),
        },
      ];

      it("should fetch application versions timeline", async () => {
        mockFetchData.mockResolvedValue([{ timeline: mockVersions }, null, null, 200]);

        const result =
          await fundingApplicationsAPI.getApplicationVersionsTimeline("APP-12345-67890");

        expect(result).toEqual(mockVersions);
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("versions/timeline"));
      });
    });

    describe("getApplicationVersions", () => {
      const mockVersions = [
        {
          id: "version-1",
          applicationId: "app-123",
          version: 1,
          applicationData: {},
          createdAt: new Date().toISOString(),
        },
      ];

      it("should fetch versions using reference number directly", async () => {
        mockFetchData.mockResolvedValue([{ timeline: mockVersions }, null, null, 200]);

        const result = await fundingApplicationsAPI.getApplicationVersions("APP-12345-67890");

        expect(result).toEqual(mockVersions);
        expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("versions/timeline"));
      });

      it("should fetch application first then get versions when given application ID", async () => {
        mockFetchData
          .mockResolvedValueOnce([
            { ...mockApplication, referenceNumber: "APP-12345-67890" },
            null,
            null,
            200,
          ])
          .mockResolvedValueOnce([{ timeline: mockVersions }, null, null, 200]);

        const result = await fundingApplicationsAPI.getApplicationVersions("app-123");

        expect(result).toEqual(mockVersions);
      });

      it("should handle errors when fetching application", async () => {
        mockFetchData.mockResolvedValue([null, "Failed to fetch application", null, 500]);
        jest.spyOn(console, "error").mockImplementation(() => {});

        await expect(fundingApplicationsAPI.getApplicationVersions("app-123")).rejects.toThrow();
        expect(console.error).toHaveBeenCalledWith(
          "Failed to fetch application versions:",
          expect.anything()
        );
      });
    });

    describe("runAIEvaluation", () => {
      const mockEvaluation = {
        success: true,
        referenceNumber: "APP-12345-67890",
        evaluation: "Application looks good",
        promptId: "prompt-123",
        updatedAt: new Date().toISOString(),
      };

      it("should run AI evaluation successfully", async () => {
        mockPost.mockResolvedValue({ data: mockEvaluation });

        const result = await fundingApplicationsAPI.runAIEvaluation("APP-12345-67890");

        expect(result).toEqual(mockEvaluation);
        expect(mockPost).toHaveBeenCalledWith("/v2/funding-applications/APP-12345-67890/evaluate");
      });
    });
  });

  describe("fundingPlatformService (combined service)", () => {
    it("should export programs API", () => {
      expect(fundingPlatformService.programs).toBe(fundingProgramsAPI);
    });

    it("should export applications API", () => {
      expect(fundingPlatformService.applications).toBe(fundingApplicationsAPI);
    });
  });
});
