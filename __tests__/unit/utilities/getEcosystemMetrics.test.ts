/**
 * @file Tests for getEcosystemMetrics utility function
 * @description Tests for fetching ecosystem metrics from the API
 */

import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { getEcosystemMetrics } from "@/utilities/registry/getEcosystemMetrics";

jest.mock("@/utilities/fetchData");
jest.mock("@/components/Utilities/errorManager");
jest.mock("@/utilities/indexer", () => ({
  INDEXER: {
    COMMUNITY: {
      V2: {
        ECOSYSTEM_METRICS: jest.fn((communityId, params) => {
          const urlParams = new URLSearchParams();
          if (params?.startDate) urlParams.append("startDate", params.startDate);
          if (params?.endDate) urlParams.append("endDate", params.endDate);
          if (params?.metricNames) urlParams.append("metricNames", params.metricNames);
          const queryString = urlParams.toString();
          return `/communities/${communityId}/ecosystem-metrics${queryString ? `?${queryString}` : ""}`;
        }),
      },
    },
  },
}));

const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;
const mockErrorManager = errorManager as jest.MockedFunction<typeof errorManager>;

describe("getEcosystemMetrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it("should fetch ecosystem metrics successfully", async () => {
    mockFetchData.mockResolvedValue([mockValidResponse, null, null, 200]);

    const result = await getEcosystemMetrics("filecoin");

    expect(result).toEqual(mockValidResponse);
    expect(mockFetchData).toHaveBeenCalledWith("/communities/filecoin/ecosystem-metrics");
  });

  it("should include query parameters when provided", async () => {
    mockFetchData.mockResolvedValue([mockValidResponse, null, null, 200]);

    const params = {
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      metricNames: "Storage Capacity",
    };

    await getEcosystemMetrics("filecoin", params);

    expect(mockFetchData).toHaveBeenCalledWith(
      "/communities/filecoin/ecosystem-metrics?startDate=2024-01-01&endDate=2024-01-31&metricNames=Storage+Capacity"
    );
  });

  it("should return null for 404 errors", async () => {
    mockFetchData.mockResolvedValue([null, new Error("Not Found"), null, 404]);

    const result = await getEcosystemMetrics("filecoin");

    expect(result).toBeNull();
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("Ecosystem metrics endpoint not found (404)")
    );
    expect(mockErrorManager).not.toHaveBeenCalled();
  });

  it("should return null and log error for non-404 errors", async () => {
    const error = new Error("Server Error");
    mockFetchData.mockResolvedValue([null, error, null, 500]);

    const result = await getEcosystemMetrics("filecoin");

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      "Error fetching ecosystem metrics:",
      error,
      "Status:",
      500
    );
    expect(mockErrorManager).toHaveBeenCalledWith("Error fetching ecosystem metrics", error);
  });

  it("should return null when data is null", async () => {
    mockFetchData.mockResolvedValue([null, null, null, 200]);

    const result = await getEcosystemMetrics("filecoin");

    expect(result).toBeNull();
  });

  it("should return null when data is undefined", async () => {
    mockFetchData.mockResolvedValue([undefined, null, null, 200]);

    const result = await getEcosystemMetrics("filecoin");

    expect(result).toBeNull();
  });

  it("should handle exceptions and return null", async () => {
    const error = new Error("Network error");
    mockFetchData.mockRejectedValue(error);

    const result = await getEcosystemMetrics("filecoin");

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalledWith("Error fetching ecosystem metrics:", error);
    expect(mockErrorManager).toHaveBeenCalledWith("Error fetching ecosystem metrics", error);
  });

  it("should handle empty params object", async () => {
    mockFetchData.mockResolvedValue([mockValidResponse, null, null, 200]);

    await getEcosystemMetrics("filecoin", {});

    expect(mockFetchData).toHaveBeenCalledWith("/communities/filecoin/ecosystem-metrics");
  });

  it("should handle partial params", async () => {
    mockFetchData.mockResolvedValue([mockValidResponse, null, null, 200]);

    await getEcosystemMetrics("filecoin", { startDate: "2024-01-01" });

    expect(mockFetchData).toHaveBeenCalledWith(
      "/communities/filecoin/ecosystem-metrics?startDate=2024-01-01"
    );
  });
});
