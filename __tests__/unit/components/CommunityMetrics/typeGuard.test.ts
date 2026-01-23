/**
 * @file Tests for community metrics type guard
 * @description Tests for isValidCommunityMetricsResponse type guard function
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { isValidCommunityMetricsResponse } from "@/components/Pages/Communities/Impact/communityMetricsUtils";
import type { CommunityMetricsResponse } from "@/types/community-metrics";

describe("isValidCommunityMetricsResponse", () => {
  const validResponse: CommunityMetricsResponse = {
    communityUID: "filecoin-uid",
    metrics: [],
    totalMetrics: 0,
  };

  it("should return true for valid CommunityMetricsResponse", () => {
    expect(isValidCommunityMetricsResponse(validResponse)).toBe(true);
  });

  it("should return true for valid response with metrics", () => {
    const responseWithMetrics: CommunityMetricsResponse = {
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

    expect(isValidCommunityMetricsResponse(responseWithMetrics)).toBe(true);
  });

  it("should return true for valid response with dateRange", () => {
    const responseWithDateRange: CommunityMetricsResponse = {
      communityUID: "filecoin-uid",
      metrics: [],
      totalMetrics: 0,
      dateRange: {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      },
    };

    expect(isValidCommunityMetricsResponse(responseWithDateRange)).toBe(true);
  });

  it("should return false for null", () => {
    expect(isValidCommunityMetricsResponse(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isValidCommunityMetricsResponse(undefined)).toBe(false);
  });

  it("should return false for non-object types", () => {
    expect(isValidCommunityMetricsResponse("string")).toBe(false);
    expect(isValidCommunityMetricsResponse(123)).toBe(false);
    expect(isValidCommunityMetricsResponse(true)).toBe(false);
    expect(isValidCommunityMetricsResponse([])).toBe(false);
  });

  it("should return false for object without communityUID", () => {
    const invalidResponse = {
      metrics: [],
    };

    expect(isValidCommunityMetricsResponse(invalidResponse)).toBe(false);
  });

  it("should return false for object with non-string communityUID", () => {
    const invalidResponse = {
      communityUID: 123,
      metrics: [],
    };

    expect(isValidCommunityMetricsResponse(invalidResponse)).toBe(false);
  });

  it("should return false for object without metrics", () => {
    const invalidResponse = {
      communityUID: "filecoin-uid",
    };

    expect(isValidCommunityMetricsResponse(invalidResponse)).toBe(false);
  });

  it("should return false for object with non-array metrics", () => {
    const invalidResponse = {
      communityUID: "filecoin-uid",
      metrics: "not-an-array",
    };

    expect(isValidCommunityMetricsResponse(invalidResponse)).toBe(false);
  });

  it("should return false for object with null metrics", () => {
    const invalidResponse = {
      communityUID: "filecoin-uid",
      metrics: null,
    };

    expect(isValidCommunityMetricsResponse(invalidResponse)).toBe(false);
  });

  it("should narrow type correctly after validation", () => {
    const unknownData: unknown = validResponse;

    if (isValidCommunityMetricsResponse(unknownData)) {
      // TypeScript should now know this is CommunityMetricsResponse
      expect(typeof unknownData.communityUID).toBe("string");
      expect(Array.isArray(unknownData.metrics)).toBe(true);
    } else {
      fail("Type guard should have returned true");
    }
  });
});
