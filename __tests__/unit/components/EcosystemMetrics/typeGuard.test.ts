/**
 * @file Tests for ecosystem metrics type guard
 * @description Tests for isValidEcosystemMetricsResponse type guard function
 */

import { isValidEcosystemMetricsResponse } from "@/components/Pages/Communities/Impact/ecosystemMetricsUtils";
import type { EcosystemMetricsResponse } from "@/types/ecosystem-metrics";

describe("isValidEcosystemMetricsResponse", () => {
  const validResponse: EcosystemMetricsResponse = {
    communityUID: "filecoin-uid",
    metrics: [],
    totalMetrics: 0,
  };

  it("should return true for valid EcosystemMetricsResponse", () => {
    expect(isValidEcosystemMetricsResponse(validResponse)).toBe(true);
  });

  it("should return true for valid response with metrics", () => {
    const responseWithMetrics: EcosystemMetricsResponse = {
      communityUID: "filecoin-uid",
      metrics: [
        {
          id: "metric-1",
          name: "Test Metric",
          description: "Test Description",
          unitOfMeasure: "FIL",
          sourceField: null,
          metadata: null,
          datapoints: [],
          latestValue: "100",
          latestDate: "2024-01-01",
          datapointCount: 1,
        },
      ],
      totalMetrics: 1,
    };

    expect(isValidEcosystemMetricsResponse(responseWithMetrics)).toBe(true);
  });

  it("should return true for valid response with dateRange", () => {
    const responseWithDateRange: EcosystemMetricsResponse = {
      communityUID: "filecoin-uid",
      metrics: [],
      totalMetrics: 0,
      dateRange: {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      },
    };

    expect(isValidEcosystemMetricsResponse(responseWithDateRange)).toBe(true);
  });

  it("should return false for null", () => {
    expect(isValidEcosystemMetricsResponse(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isValidEcosystemMetricsResponse(undefined)).toBe(false);
  });

  it("should return false for non-object types", () => {
    expect(isValidEcosystemMetricsResponse("string")).toBe(false);
    expect(isValidEcosystemMetricsResponse(123)).toBe(false);
    expect(isValidEcosystemMetricsResponse(true)).toBe(false);
    expect(isValidEcosystemMetricsResponse([])).toBe(false);
  });

  it("should return false for object without communityUID", () => {
    const invalidResponse = {
      metrics: [],
    };

    expect(isValidEcosystemMetricsResponse(invalidResponse)).toBe(false);
  });

  it("should return false for object with non-string communityUID", () => {
    const invalidResponse = {
      communityUID: 123,
      metrics: [],
    };

    expect(isValidEcosystemMetricsResponse(invalidResponse)).toBe(false);
  });

  it("should return false for object without metrics", () => {
    const invalidResponse = {
      communityUID: "filecoin-uid",
    };

    expect(isValidEcosystemMetricsResponse(invalidResponse)).toBe(false);
  });

  it("should return false for object with non-array metrics", () => {
    const invalidResponse = {
      communityUID: "filecoin-uid",
      metrics: "not-an-array",
    };

    expect(isValidEcosystemMetricsResponse(invalidResponse)).toBe(false);
  });

  it("should return false for object with null metrics", () => {
    const invalidResponse = {
      communityUID: "filecoin-uid",
      metrics: null,
    };

    expect(isValidEcosystemMetricsResponse(invalidResponse)).toBe(false);
  });

  it("should narrow type correctly after validation", () => {
    const unknownData: unknown = validResponse;

    if (isValidEcosystemMetricsResponse(unknownData)) {
      // TypeScript should now know this is EcosystemMetricsResponse
      expect(typeof unknownData.communityUID).toBe("string");
      expect(Array.isArray(unknownData.metrics)).toBe(true);
    } else {
      fail("Type guard should have returned true");
    }
  });
});
