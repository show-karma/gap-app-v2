import type { Mock } from "vitest";
import { milestoneReportService } from "@/services/milestone-report.service";
import { api } from "@/utilities/api/client";
import { NetworkError } from "@/utilities/api/errors";

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

const mockedApiGet = api.get as unknown as Mock;

describe("milestoneReportService.getReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiGet.mockResolvedValue({
      data: [],
      pageInfo: { totalItems: 0, page: 1, pageLimit: 50 },
      uniqueProjectCount: 0,
      stats: {
        totalGrants: 0,
        totalProjectsWithMilestones: 0,
        totalMilestones: 0,
        totalCompletedMilestones: 0,
        totalPendingMilestones: 0,
        totalProjects: 0,
        percentageProjectsWithMilestones: 0,
        percentageCompletedMilestones: 0,
        percentagePendingMilestones: 0,
      },
    });
  });

  it("should_call_v2_endpoint_with_pageLimit_and_sortField_query_params", async () => {
    await milestoneReportService.getReport("filecoin", 2, 50, "totalMilestones", "desc");

    const url = mockedApiGet.mock.calls[0][0] as string;

    expect(url).toContain("/v2/communities/filecoin/milestones/report");
    expect(url).toContain("pageLimit=50");
    expect(url).toContain("page=2");
    expect(url).toContain("sortField=totalMilestones");
    expect(url).toContain("sortOrder=desc");
    expect(url).not.toContain("limit=50");
    expect(url).not.toContain("sort=totalMilestones");
  });

  it("should_normalize_and_pass_program_ids_when_provided", async () => {
    await milestoneReportService.getReport("filecoin", 1, 50, "totalMilestones", "desc", [
      "100_42161",
      "200",
    ]);

    const url = mockedApiGet.mock.calls[0][0] as string;

    expect(url).toContain("programIds=");
  });

  it("should_pass_reviewerAddress_when_provided", async () => {
    await milestoneReportService.getReport(
      "filecoin",
      1,
      50,
      "totalMilestones",
      "desc",
      [],
      "0x1234567890abcdef1234567890abcdef12345678"
    );

    const url = mockedApiGet.mock.calls[0][0] as string;

    expect(url).toContain("reviewerAddress=0x1234567890abcdef1234567890abcdef12345678");
  });

  it("should_throw_when_fetchData_returns_an_error", async () => {
    mockedApiGet.mockRejectedValueOnce(
      new NetworkError({
        endpoint: "/v2/communities/filecoin/milestones/report",
        method: "GET",
        message: "network down",
      })
    );

    await expect(milestoneReportService.getReport("filecoin", 1, 50)).rejects.toThrow();
  });

  it("should_return_empty_response_when_fetchData_returns_null_data", async () => {
    mockedApiGet.mockResolvedValueOnce(null);

    const result = await milestoneReportService.getReport("filecoin", 1, 50);

    expect(result.data).toEqual([]);
    expect(result.pageInfo).toEqual({ totalItems: 0, page: 1, pageLimit: 50 });
    expect(result.uniqueProjectCount).toBe(0);
  });
});
