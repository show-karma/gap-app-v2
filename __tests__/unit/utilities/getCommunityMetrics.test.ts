/**
 * @file Tests for getCommunityMetrics utility function
 * @description Tests for fetching community metrics from the API
 */

import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { getCommunityMetrics } from "@/utilities/registry/getCommunityMetrics";

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
  },
}));
vi.mock("@/components/Utilities/errorManager");
vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    COMMUNITY: {
      V2: {
        COMMUNITY_METRICS: vi.fn((communityId, params) => {
          const urlParams = new URLSearchParams();
          if (params?.startDate) urlParams.append("startDate", params.startDate);
          if (params?.endDate) urlParams.append("endDate", params.endDate);
          if (params?.metricNames) urlParams.append("metricNames", params.metricNames);
          const queryString = urlParams.toString();
          return `/v2/communities/${communityId}/community-metrics${queryString ? `?${queryString}` : ""}`;
        }),
      },
    },
  },
}));

const mockApiGet = api.get as vi.MockedFunction<typeof api.get>;
const mockErrorManager = errorManager as vi.MockedFunction<typeof errorManager>;

function makeHttpError(status: number): HttpError {
  return new HttpError(status, {
    endpoint: "/v2/communities/filecoin/community-metrics",
    method: "GET",
  });
}

describe("getCommunityMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockValidResponse = {
    communityUID: "filecoin-uid",
    metrics: [
      {
        id: "metric-1",
        name: "Storage Capacity",
        description: "Total storage capacity",
        unitOfMeasure: "PiB",
        sourceField: null,
        metadata: null,
        datapoints: [
          { date: "2024-01-01", value: "100", proof: null },
          { date: "2024-01-02", value: "200", proof: null },
        ],
        latestValue: "200",
        latestDate: "2024-01-02",
        datapointCount: 2,
      },
    ],
    totalMetrics: 1,
  };

  it("should fetch community metrics successfully", async () => {
    mockApiGet.mockResolvedValue(mockValidResponse);

    const result = await getCommunityMetrics("filecoin");

    expect(result).toEqual(mockValidResponse);
    expect(mockApiGet).toHaveBeenCalledWith("/v2/communities/filecoin/community-metrics");
  });

  it("should include query parameters when provided", async () => {
    mockApiGet.mockResolvedValue(mockValidResponse);

    const params = {
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      metricNames: "Storage Capacity",
    };

    await getCommunityMetrics("filecoin", params);

    expect(mockApiGet).toHaveBeenCalledWith(
      "/v2/communities/filecoin/community-metrics?startDate=2024-01-01&endDate=2024-01-31&metricNames=Storage+Capacity"
    );
  });

  it("should return null for 404 errors", async () => {
    mockApiGet.mockRejectedValue(makeHttpError(404));

    const result = await getCommunityMetrics("filecoin");

    expect(result).toBeNull();
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("Community metrics endpoint not found (404)")
    );
    expect(mockErrorManager).not.toHaveBeenCalled();
  });

  it("should return null and log error for non-404 errors", async () => {
    const error = makeHttpError(500);
    mockApiGet.mockRejectedValue(error);

    const result = await getCommunityMetrics("filecoin");

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      "Error fetching community metrics:",
      error,
      "Status:",
      500
    );
    expect(mockErrorManager).toHaveBeenCalledWith("Error fetching community metrics", error);
  });

  it("should return null when data is null", async () => {
    mockApiGet.mockResolvedValue(null);

    const result = await getCommunityMetrics("filecoin");

    expect(result).toBeNull();
  });

  it("should return null when data is undefined", async () => {
    mockApiGet.mockResolvedValue(undefined);

    const result = await getCommunityMetrics("filecoin");

    expect(result).toBeNull();
  });

  it("should handle exceptions and return null", async () => {
    const error = new Error("Network error");
    mockApiGet.mockRejectedValue(error);

    const result = await getCommunityMetrics("filecoin");

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalledWith("Error fetching community metrics:", error);
    expect(mockErrorManager).toHaveBeenCalledWith("Error fetching community metrics", error);
  });

  it("should handle empty params object", async () => {
    mockApiGet.mockResolvedValue(mockValidResponse);

    await getCommunityMetrics("filecoin", {});

    expect(mockApiGet).toHaveBeenCalledWith("/v2/communities/filecoin/community-metrics");
  });

  it("should handle partial params", async () => {
    mockApiGet.mockResolvedValue(mockValidResponse);

    await getCommunityMetrics("filecoin", { startDate: "2024-01-01" });

    expect(mockApiGet).toHaveBeenCalledWith(
      "/v2/communities/filecoin/community-metrics?startDate=2024-01-01"
    );
  });
});
