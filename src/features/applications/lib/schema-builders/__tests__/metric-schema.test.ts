import { describe, expect, it } from "vitest";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";
import { buildMetricSchema } from "../metric-schema";

const baseQuestion: ApplicationQuestion = {
  id: "metrics",
  type: "metric",
  label: "Impact Metrics",
  required: true,
};

const validMetric = {
  metric: "Monthly active users",
  dataSource: "Dune Analytics dashboard",
  howItsMeasured: "Unique wallet addresses interacting with the contract each month",
  target: "10,000 by Q4",
};

describe("buildMetricSchema — required sub-fields", () => {
  it("accepts a metric with all required fields populated", () => {
    const schema = buildMetricSchema(baseQuestion);

    const result = schema.safeParse([validMetric]);

    expect(result.success).toBe(true);
  });

  it("rejects a metric with empty dataSource", () => {
    const schema = buildMetricSchema(baseQuestion);

    const result = schema.safeParse([{ ...validMetric, dataSource: "" }]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).toContain("Data source is required");
    }
  });

  it("rejects a metric with empty howItsMeasured", () => {
    const schema = buildMetricSchema(baseQuestion);

    const result = schema.safeParse([{ ...validMetric, howItsMeasured: "" }]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).toContain("How it's measured is required");
    }
  });

  it("rejects a metric with empty target", () => {
    const schema = buildMetricSchema(baseQuestion);

    const result = schema.safeParse([{ ...validMetric, target: "" }]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).toContain("Target is required");
    }
  });

  it("rejects a metric missing target entirely", () => {
    const schema = buildMetricSchema(baseQuestion);
    const { target: _drop, ...withoutTarget } = validMetric;

    const result = schema.safeParse([withoutTarget]);

    expect(result.success).toBe(false);
  });

  it("applies required sub-field validation even on optional metric arrays", () => {
    const schema = buildMetricSchema({ ...baseQuestion, required: false });

    const result = schema.safeParse([{ ...validMetric, target: "" }]);

    expect(result.success).toBe(false);
  });

  it("accepts an empty array when the metric field is optional", () => {
    const schema = buildMetricSchema({ ...baseQuestion, required: false });

    const result = schema.safeParse([]);

    expect(result.success).toBe(true);
  });
});

describe("buildMetricSchema — min/max limits", () => {
  it("rejects fewer entries than minMetrics", () => {
    const schema = buildMetricSchema({
      ...baseQuestion,
      validation: { minMetrics: 2 },
    });

    const result = schema.safeParse([validMetric]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).toContain("at least 2 metrics");
    }
  });

  it("rejects more entries than maxMetrics", () => {
    const schema = buildMetricSchema({
      ...baseQuestion,
      validation: { maxMetrics: 1 },
    });

    const result = schema.safeParse([validMetric, validMetric]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).toContain("Maximum 1 metric");
    }
  });
});
