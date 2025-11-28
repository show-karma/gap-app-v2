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

// Mock the API client factory - must be hoisted before imports
jest.mock("@/utilities/auth/api-client", () => {
  const mockGet = jest.fn();
  const mockPost = jest.fn();
  const mockPut = jest.fn();
  const mockDelete = jest.fn();

  return {
    createAuthenticatedApiClient: jest.fn(() => ({
      get: mockGet,
      post: mockPost,
      put: mockPut,
      delete: mockDelete,
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    })),
    // Export mocks for test access
    __mockGet: mockGet,
    __mockPost: mockPost,
    __mockPut: mockPut,
    __mockDelete: mockDelete,
  };
});

jest.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));

// Import service and mock utilities after mocks are configured
import {
  fundingApplicationsAPI,
  fundingPlatformService,
  fundingProgramsAPI,
} from "../fundingPlatformService";

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
        mockGet.mockResolvedValue({ data: mockPrograms });

        const result = await fundingProgramsAPI.getProgramsByCommunity("community-123");

        expect(result).toEqual(mockPrograms);
        expect(mockGet).toHaveBeenCalledWith("/v2/funding-program-configs/community/community-123");
      });

      it("should handle API errors", async () => {
        const error = { response: { data: { message: "Not found" } }, message: "API Error" };
        mockGet.mockRejectedValue(error);

        await expect(
          fundingProgramsAPI.getProgramsByCommunity("invalid-community")
        ).rejects.toEqual(error);
        expect(console.error).toHaveBeenCalledWith("API Error:", expect.any(Object));
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
        mockGet.mockResolvedValue({ data: [programWithMetrics] });

        const result = await fundingProgramsAPI.getProgramsByCommunity("community-123");

        expect(result).toEqual([programWithMetrics]);
      });
    });

    describe("getProgramConfiguration", () => {
      it("should fetch program configuration successfully", async () => {
        mockGet.mockResolvedValue({ data: mockProgram });

        const result = await fundingProgramsAPI.getProgramConfiguration("program-123", 1);

        expect(result).toEqual(mockProgram);
        expect(mockGet).toHaveBeenCalledWith("/v2/funding-program-configs/program-123/1");
      });

      it("should handle 404 errors", async () => {
        const error = { response: { status: 404 } };
        mockGet.mockRejectedValue(error);

        await expect(fundingProgramsAPI.getProgramConfiguration("nonexistent", 1)).rejects.toEqual(
          error
        );
      });
    });

    describe("getAllProgramConfigs", () => {
      it("should fetch all program configs without community filter", async () => {
        mockGet.mockResolvedValue({ data: [mockProgram] });

        const result = await fundingProgramsAPI.getAllProgramConfigs();

        expect(result).toEqual([mockProgram]);
        expect(mockGet).toHaveBeenCalledWith("/v2/funding-program-configs");
      });

      it("should fetch program configs with community filter", async () => {
        mockGet.mockResolvedValue({ data: [mockProgram] });

        const result = await fundingProgramsAPI.getAllProgramConfigs("community-123");

        expect(result).toEqual([mockProgram]);
        expect(mockGet).toHaveBeenCalledWith("/v2/funding-program-configs?community=community-123");
      });
    });

    describe("getEnabledPrograms", () => {
      it("should fetch enabled programs", async () => {
        mockGet.mockResolvedValue({ data: [mockProgram] });

        const result = await fundingProgramsAPI.getEnabledPrograms();

        expect(result).toEqual([mockProgram]);
        expect(mockGet).toHaveBeenCalledWith("/v2/funding-program-configs/enabled");
      });
    });

    describe("createProgramConfiguration", () => {
      it("should create program configuration", async () => {
        mockPost.mockResolvedValue({ data: mockProgram });

        const result = await fundingProgramsAPI.createProgramConfiguration(
          "program-123",
          1,
          mockProgram
        );

        expect(result).toEqual(mockProgram);
        expect(mockPost).toHaveBeenCalledWith(
          "/v2/funding-program-configs/program-123/1",
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
          1,
          updatedProgram
        );

        expect(result).toEqual(updatedProgram);
        expect(mockPut).toHaveBeenCalledWith(
          "/v2/funding-program-configs/program-123/1",
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
        mockGet.mockResolvedValue({ data: mockProgram });
        mockPut.mockResolvedValue({
          data: { ...mockProgram, formSchema: mockFormSchema },
        });

        const result = await fundingProgramsAPI.updateFormSchema("program-123", 1, mockFormSchema);

        expect(result.formSchema).toEqual(mockFormSchema);
        expect(mockGet).toHaveBeenCalledWith("/v2/funding-program-configs/program-123/1");
        expect(mockPut).toHaveBeenCalledWith(
          "/v2/funding-program-configs/program-123/1",
          expect.objectContaining({ formSchema: mockFormSchema })
        );
      });

      it("should create new config with formSchema when config does not exist", async () => {
        const error = { response: { status: 404 } };
        mockGet.mockRejectedValue(error);
        mockPut.mockResolvedValue({
          data: { ...mockProgram, formSchema: mockFormSchema },
        });

        const result = await fundingProgramsAPI.updateFormSchema("program-123", 1, mockFormSchema);

        expect(result.formSchema).toEqual(mockFormSchema);
        expect(mockPut).toHaveBeenCalledWith("/v2/funding-program-configs/program-123/1", {
          formSchema: mockFormSchema,
        });
      });

      it("should throw error for non-404 errors", async () => {
        const error = { response: { status: 500 }, message: "Server error" };
        mockGet.mockRejectedValue(error);

        await expect(
          fundingProgramsAPI.updateFormSchema("program-123", 1, mockFormSchema)
        ).rejects.toEqual(error);
      });
    });

    describe("toggleProgramStatus", () => {
      it("should toggle program status when config exists", async () => {
        mockGet.mockResolvedValue({ data: mockProgram });
        mockPut.mockResolvedValue({ data: { ...mockProgram, isEnabled: false } });

        const result = await fundingProgramsAPI.toggleProgramStatus("program-123", 1, false);

        expect(result.isEnabled).toBe(false);
        expect(mockPut).toHaveBeenCalledWith(
          "/v2/funding-program-configs/program-123/1",
          expect.objectContaining({ isEnabled: false })
        );
      });

      it("should create new config with enabled status when config does not exist", async () => {
        const error = { response: { status: 404 } };
        mockGet.mockRejectedValue(error);
        mockPut.mockResolvedValue({ data: { ...mockProgram, isEnabled: true } });

        const result = await fundingProgramsAPI.toggleProgramStatus("program-123", 1, true);

        expect(result.isEnabled).toBe(true);
        expect(mockPut).toHaveBeenCalledWith("/v2/funding-program-configs/program-123/1", {
          isEnabled: true,
        });
      });

      it("should throw error for non-404 errors", async () => {
        const error = { response: { status: 500 }, message: "Server error" };
        mockGet.mockRejectedValue(error);

        await expect(
          fundingProgramsAPI.toggleProgramStatus("program-123", 1, true)
        ).rejects.toEqual(error);
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
        mockGet.mockResolvedValue({ data: mockStats });

        const result = await fundingProgramsAPI.getProgramStats("program-123", 1);

        expect(result).toEqual(mockStats);
        expect(mockGet).toHaveBeenCalledWith(
          "/v2/funding-applications/program/program-123/1/statistics"
        );
      });

      it("should return default stats on error", async () => {
        mockGet.mockRejectedValue(new Error("Failed to fetch stats"));

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
        chainID: 1,
        applicantEmail: "test@example.com",
        applicationData: {},
      };

      it("should submit application successfully", async () => {
        mockPost.mockResolvedValue({ data: mockApplication });

        const result = await fundingApplicationsAPI.submitApplication(submitRequest);

        expect(result).toEqual(mockApplication);
        expect(mockPost).toHaveBeenCalledWith(
          "/v2/funding-applications/program-123/1",
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
        mockGet.mockResolvedValue({ data: mockPaginatedResponse });

        const result = await fundingApplicationsAPI.getApplicationsByProgram("program-123", 1);

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockGet).toHaveBeenCalledWith("/v2/funding-applications/program/program-123/1?");
      });

      it("should fetch applications with status filter", async () => {
        mockGet.mockResolvedValue({ data: mockPaginatedResponse });

        const result = await fundingApplicationsAPI.getApplicationsByProgram("program-123", 1, {
          status: "pending",
        });

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockGet).toHaveBeenCalledWith(
          "/v2/funding-applications/program/program-123/1?status=pending"
        );
      });

      it("should fetch applications with pagination", async () => {
        mockGet.mockResolvedValue({ data: mockPaginatedResponse });

        const result = await fundingApplicationsAPI.getApplicationsByProgram("program-123", 1, {
          page: 2,
          limit: 10,
        });

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockGet).toHaveBeenCalledWith(
          "/v2/funding-applications/program/program-123/1?page=2&limit=10"
        );
      });

      it("should fetch applications with search filter", async () => {
        mockGet.mockResolvedValue({ data: mockPaginatedResponse });

        const result = await fundingApplicationsAPI.getApplicationsByProgram("program-123", 1, {
          search: "test project",
        });

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockGet).toHaveBeenCalledWith(
          "/v2/funding-applications/program/program-123/1?search=test+project"
        );
      });

      it("should fetch applications with date filters", async () => {
        mockGet.mockResolvedValue({ data: mockPaginatedResponse });

        const result = await fundingApplicationsAPI.getApplicationsByProgram("program-123", 1, {
          dateFrom: "2024-01-01",
          dateTo: "2024-12-31",
        });

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockGet).toHaveBeenCalledWith(
          "/v2/funding-applications/program/program-123/1?dateFrom=2024-01-01&dateTo=2024-12-31"
        );
      });

      it("should fetch applications with sorting", async () => {
        mockGet.mockResolvedValue({ data: mockPaginatedResponse });

        const result = await fundingApplicationsAPI.getApplicationsByProgram("program-123", 1, {
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockGet).toHaveBeenCalledWith(
          "/v2/funding-applications/program/program-123/1?sortBy=createdAt&sortOrder=desc"
        );
      });

      it("should handle empty applications response", async () => {
        mockGet.mockResolvedValue({ data: {} });

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
        mockGet.mockResolvedValue({ data: {} });

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
        mockGet.mockResolvedValue({ data: mockApplication });

        const result = await fundingApplicationsAPI.getApplication("app-123");

        expect(result).toEqual(mockApplication);
        expect(mockGet).toHaveBeenCalledWith("/v2/funding-applications/app-123");
      });

      it("should handle 404 errors", async () => {
        const error = { response: { status: 404 } };
        mockGet.mockRejectedValue(error);

        await expect(fundingApplicationsAPI.getApplication("nonexistent")).rejects.toEqual(error);
      });
    });

    describe("getApplicationByReference", () => {
      it("should fetch application by reference number", async () => {
        mockGet.mockResolvedValue({ data: mockApplication });

        const result = await fundingApplicationsAPI.getApplicationByReference("APP-12345-67890");

        expect(result).toEqual(mockApplication);
        expect(mockGet).toHaveBeenCalledWith("/v2/funding-applications/APP-12345-67890");
      });
    });

    describe("getApplicationByEmail", () => {
      it("should fetch application by email successfully", async () => {
        mockGet.mockResolvedValue({ data: mockApplication });

        const result = await fundingApplicationsAPI.getApplicationByEmail(
          "program-123",
          1,
          "test@example.com"
        );

        expect(result).toEqual(mockApplication);
        expect(mockGet).toHaveBeenCalledWith(
          "/v2/funding-applications/program/program-123/1/by-email?email=test%40example.com"
        );
      });

      it("should return null for 404 errors", async () => {
        const error = { response: { status: 404 } };
        mockGet.mockRejectedValue(error);

        const result = await fundingApplicationsAPI.getApplicationByEmail(
          "program-123",
          1,
          "nonexistent@example.com"
        );

        expect(result).toBeNull();
      });

      it("should throw error for non-404 errors", async () => {
        const error = { response: { status: 500 }, message: "Server error" };
        mockGet.mockRejectedValue(error);

        await expect(
          fundingApplicationsAPI.getApplicationByEmail("program-123", 1, "test@example.com")
        ).rejects.toEqual(error);
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
        mockGet.mockResolvedValue({ data: mockStats });

        const result = await fundingApplicationsAPI.getApplicationStatistics("program-123", 1);

        expect(result).toEqual(mockStats);
        expect(mockGet).toHaveBeenCalledWith(
          "/v2/funding-applications/program/program-123/1/statistics"
        );
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
        expect(mockGet).toHaveBeenCalledWith(
          "/v2/funding-applications/program/program-123/1/export?format=json",
          { responseType: "json" }
        );
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
        expect(mockGet).toHaveBeenCalledWith(
          "/v2/funding-applications/program/program-123/1/export?format=csv",
          { responseType: "blob" }
        );
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
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining("format=json&status=pending&search=test"),
          { responseType: "json" }
        );
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
        expect(mockGet).toHaveBeenCalledWith(
          "/v2/funding-applications/admin/program-123/1/export?format=json",
          { responseType: "json" }
        );
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
        mockGet.mockResolvedValue({ data: { timeline: mockVersions } });

        const result =
          await fundingApplicationsAPI.getApplicationVersionsTimeline("APP-12345-67890");

        expect(result).toEqual(mockVersions);
        expect(mockGet).toHaveBeenCalledWith(
          "/v2/funding-applications/APP-12345-67890/versions/timeline"
        );
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
        mockGet.mockResolvedValue({ data: { timeline: mockVersions } });

        const result = await fundingApplicationsAPI.getApplicationVersions("APP-12345-67890");

        expect(result).toEqual(mockVersions);
        expect(mockGet).toHaveBeenCalledWith(
          "/v2/funding-applications/APP-12345-67890/versions/timeline"
        );
      });

      it("should fetch application first then get versions when given application ID", async () => {
        mockGet
          .mockResolvedValueOnce({
            data: { ...mockApplication, referenceNumber: "APP-12345-67890" },
          })
          .mockResolvedValueOnce({ data: { timeline: mockVersions } });

        const result = await fundingApplicationsAPI.getApplicationVersions("app-123");

        expect(result).toEqual(mockVersions);
        expect(mockGet).toHaveBeenCalledWith("/v2/funding-applications/app-123");
        expect(mockGet).toHaveBeenCalledWith(
          "/v2/funding-applications/APP-12345-67890/versions/timeline"
        );
      });

      it("should handle errors when fetching application", async () => {
        const error = new Error("Failed to fetch application");
        mockGet.mockRejectedValue(error);
        jest.spyOn(console, "error").mockImplementation(() => {});

        await expect(fundingApplicationsAPI.getApplicationVersions("app-123")).rejects.toEqual(
          error
        );
        expect(console.error).toHaveBeenCalledWith("Failed to fetch application versions:", error);
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
