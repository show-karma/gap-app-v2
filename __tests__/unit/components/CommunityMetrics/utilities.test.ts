/**
 * @file Tests for community metrics utility functions
 * @description Tests for formatMetricValue, formatChartValue, and prepareCommunityMetricsChartData
 */

import {
  calculateDateRange,
  formatChartValue,
  formatMetricValue,
  prepareCommunityMetricsChartData,
} from "@/components/Pages/Communities/Impact/communityMetricsUtils";
import type { CommunityMetric } from "@/types/community-metrics";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";

// Mock formatCurrency and formatDate
jest.mock("@/utilities/formatCurrency");
jest.mock("@/utilities/formatDate");

const mockFormatCurrency = formatCurrency as jest.MockedFunction<typeof formatCurrency>;
const mockFormatDate = formatDate as jest.MockedFunction<typeof formatDate>;

describe("formatMetricValue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatCurrency.mockImplementation((val) => `$${val.toLocaleString()}`);
  });

  it("should return value as-is for NaN", () => {
    expect(formatMetricValue("not-a-number", "FIL")).toBe("not-a-number");
  });

  it("should use formatCurrency for normal-sized numbers", () => {
    mockFormatCurrency.mockReturnValue("$1,000.00");
    expect(formatMetricValue("1000", "FIL")).toBe("$1,000.00 FIL");
  });

  it("should use scientific notation for very small numbers (< 0.000001)", () => {
    const result = formatMetricValue("0.0000005", "FIL");
    expect(result).toMatch(/^[\d.]+e-\d+ FIL$/);
  });

  it("should use fixed decimal places for small numbers (0.000001 to 0.0001)", () => {
    const result = formatMetricValue("0.00005", "FIL");
    expect(result).toMatch(/^0\.0{4,7}5+ FIL$/);
  });

  it("should handle zero", () => {
    mockFormatCurrency.mockReturnValue("$0.00");
    expect(formatMetricValue("0", "FIL")).toBe("$0.00 FIL");
  });

  it("should handle negative numbers", () => {
    mockFormatCurrency.mockReturnValue("-$100.00");
    expect(formatMetricValue("-100", "FIL")).toBe("-$100.00 FIL");
  });

  it("should handle negative small numbers in formatMetricValue", () => {
    mockFormatCurrency.mockReturnValue("-$0.00");
    const result = formatMetricValue("-0.00005", "FIL");
    // Should use formatCurrency for negative numbers, even if small
    expect(result).toBe("-$0.00 FIL");
  });
});

describe("formatChartValue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatCurrency.mockImplementation((val) => `$${val.toLocaleString()}`);
  });

  it("should use formatCurrency for normal-sized numbers", () => {
    mockFormatCurrency.mockReturnValue("$1,000.00");
    expect(formatChartValue(1000, "FIL")).toBe("$1,000.00 FIL");
  });

  it("should use scientific notation for very small numbers (< 0.000001)", () => {
    const result = formatChartValue(0.0000005, "FIL");
    expect(result).toMatch(/^[\d.]+e-\d+ FIL$/);
  });

  it("should use fixed decimal places for small numbers (0.000001 to 0.0001)", () => {
    const result = formatChartValue(0.00005, "FIL");
    expect(result).toMatch(/^0\.0{4,7}5+ FIL$/);
  });

  it("should handle zero", () => {
    mockFormatCurrency.mockReturnValue("$0.00");
    expect(formatChartValue(0, "FIL")).toBe("$0.00 FIL");
  });

  it("should handle negative numbers", () => {
    mockFormatCurrency.mockReturnValue("-$100.00");
    expect(formatChartValue(-100, "FIL")).toBe("-$100.00 FIL");
  });

  it("should use scientific notation for extremely small numbers in formatChartValue", () => {
    const result = formatChartValue(0.0000005, "FIL");
    expect(result).toMatch(/^[\d.]+e-\d+ FIL$/);
  });

  it("should use fixed decimal places for small numbers in formatChartValue", () => {
    const result = formatChartValue(0.00005, "FIL");
    expect(result).toMatch(/^0\.0{4,7}5+ FIL$/);
  });
});

describe("prepareCommunityMetricsChartData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatDate.mockImplementation((date) => date.toISOString().split("T")[0]);
  });

  it("should return empty array for metric with no datapoints", () => {
    const metric: CommunityMetric = {
      id: "metric-1",
      name: "Test Metric",
      description: "Test",
      unitOfMeasure: "FIL",
      sourceField: null,
      metadata: null,
      datapoints: [],
      latestValue: null,
      latestDate: null,
      datapointCount: 0,
    };

    expect(prepareCommunityMetricsChartData(metric)).toEqual([]);
  });

  it("should return empty array for metric with null datapoints", () => {
    const metric: CommunityMetric = {
      id: "metric-1",
      name: "Test Metric",
      description: "Test",
      unitOfMeasure: "FIL",
      sourceField: null,
      metadata: null,
      datapoints: null as any,
      latestValue: null,
      latestDate: null,
      datapointCount: 0,
    };

    expect(prepareCommunityMetricsChartData(metric)).toEqual([]);
  });

  it("should sort datapoints by date ascending", () => {
    const metric: CommunityMetric = {
      id: "metric-1",
      name: "Test Metric",
      description: "Test",
      unitOfMeasure: "FIL",
      sourceField: null,
      metadata: null,
      datapoints: [
        { date: "2024-01-03", value: "300", proof: null },
        { date: "2024-01-01", value: "100", proof: null },
        { date: "2024-01-02", value: "200", proof: null },
      ],
      latestValue: "300",
      latestDate: "2024-01-03",
      datapointCount: 3,
    };

    const result = prepareCommunityMetricsChartData(metric);

    expect(result).toHaveLength(3);
    expect(result[0].date).toBe("2024-01-01");
    expect(result[0]["Test Metric"]).toBe(100); // Raw value
    expect(result[1].date).toBe("2024-01-02");
    expect(result[1]["Test Metric"]).toBe(200); // Raw value
    expect(result[2].date).toBe("2024-01-03");
    expect(result[2]["Test Metric"]).toBe(300); // Raw value
    // Moving average will be undefined for < 30 datapoints
  });

  it("should format chart data correctly", () => {
    const metric: CommunityMetric = {
      id: "metric-1",
      name: "Storage Capacity",
      description: "Test",
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
    };

    mockFormatDate.mockReturnValueOnce("2024-01-01").mockReturnValueOnce("2024-01-02");

    const result = prepareCommunityMetricsChartData(metric);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      date: "2024-01-01",
      "Storage Capacity": 100, // Raw value
    });
    expect(result[1]).toMatchObject({
      date: "2024-01-02",
      "Storage Capacity": 200, // Raw value
    });
    // Moving average will be undefined for < 30 datapoints
  });

  it("should handle invalid numeric values by defaulting to 0", () => {
    const metric: CommunityMetric = {
      id: "metric-1",
      name: "Test Metric",
      description: "Test",
      unitOfMeasure: "FIL",
      sourceField: null,
      metadata: null,
      datapoints: [
        { date: "2024-01-01", value: "invalid", proof: null },
        { date: "2024-01-02", value: "100", proof: null },
      ],
      latestValue: "100",
      latestDate: "2024-01-02",
      datapointCount: 2,
    };

    mockFormatDate.mockReturnValueOnce("2024-01-01").mockReturnValueOnce("2024-01-02");

    const result = prepareCommunityMetricsChartData(metric);

    expect(result[0]["Test Metric"]).toBe(0); // Raw value defaults to 0
    expect(result[1]["Test Metric"]).toBe(100); // Raw value
    // Moving average will be undefined for < 30 datapoints
  });

  it("should use metric name as the key in chart data", () => {
    const metric: CommunityMetric = {
      id: "metric-1",
      name: "Custom Metric Name",
      description: "Test",
      unitOfMeasure: "FIL",
      sourceField: null,
      metadata: null,
      datapoints: [{ date: "2024-01-01", value: "100", proof: null }],
      latestValue: "100",
      latestDate: "2024-01-01",
      datapointCount: 1,
    };

    mockFormatDate.mockReturnValue("2024-01-01");

    const result = prepareCommunityMetricsChartData(metric);

    expect(result[0]).toHaveProperty("Custom Metric Name"); // Raw value
    expect(result[0]["Custom Metric Name"]).toBe(100);
    // Moving average will be undefined for < 30 datapoints
  });

  it("should filter out datapoints with invalid date strings", () => {
    const metric: CommunityMetric = {
      id: "metric-1",
      name: "Test Metric",
      description: "Test",
      unitOfMeasure: "FIL",
      sourceField: null,
      metadata: null,
      datapoints: [
        { date: "invalid-date", value: "100", proof: null },
        { date: "2024-01-01", value: "200", proof: null },
      ],
      latestValue: "200",
      latestDate: "2024-01-01",
      datapointCount: 2,
    };

    mockFormatDate.mockReturnValue("2024-01-01");

    const result = prepareCommunityMetricsChartData(metric);

    // Should filter out invalid dates and only return valid ones
    expect(result).toHaveLength(1);
    expect(result[0]["Test Metric"]).toBe(200); // Raw value
    expect(result[0].date).toBe("2024-01-01");
    // Moving average will be undefined for < 30 datapoints
  });
});

describe("calculateDateRange", () => {
  let mockNow: Date;

  beforeEach(() => {
    mockNow = new Date("2024-01-15T10:00:00Z");
    jest.useFakeTimers();
    jest.setSystemTime(mockNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should calculate 1 month range correctly", () => {
    const result = calculateDateRange("1_month");
    expect(result).toEqual({
      startDate: "2023-12-15",
      endDate: "2024-01-15",
    });
  });

  it("should calculate 3 months range correctly", () => {
    const result = calculateDateRange("3_months");
    expect(result).toEqual({
      startDate: "2023-10-15",
      endDate: "2024-01-15",
    });
  });

  it("should calculate 6 months range correctly", () => {
    const result = calculateDateRange("6_months");
    expect(result).toEqual({
      startDate: "2023-07-15",
      endDate: "2024-01-15",
    });
  });

  it("should calculate 1 year range correctly", () => {
    const result = calculateDateRange("1_year");
    expect(result).toEqual({
      startDate: "2023-01-15",
      endDate: "2024-01-15",
    });
  });
});
