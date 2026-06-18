import {
  deriveRequiredMap,
  METRIC_FIELD_REQUIRED,
  MILESTONE_FIELD_REQUIRED,
  metricItemSchema,
  milestoneItemSchema,
} from "../repeatable-item-schemas";

const validMilestone = {
  title: "Ship v1",
  description: "",
  dueDate: "2024-12-31",
  fundingRequested: "5000",
  completionCriteria: "All tests pass",
};

function firstError(result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}): string {
  if (result.success) throw new Error("expected validation to fail");
  return result.error!.issues[0].message;
}

describe("milestoneItemSchema", () => {
  it("accepts a milestone with an empty description (issue #1179 fix)", () => {
    expect(milestoneItemSchema.safeParse(validMilestone).success).toBe(true);
  });

  it("accepts a milestone with a filled description", () => {
    expect(
      milestoneItemSchema.safeParse({ ...validMilestone, description: "Build the thing" }).success
    ).toBe(true);
  });

  it("rejects an empty title with the required message", () => {
    expect(firstError(milestoneItemSchema.safeParse({ ...validMilestone, title: "" }))).toBe(
      "Milestone title is required"
    );
  });

  it("rejects an empty due date with the required message", () => {
    expect(firstError(milestoneItemSchema.safeParse({ ...validMilestone, dueDate: "" }))).toBe(
      "Due date is required"
    );
  });

  it("rejects empty funding requested with the required message", () => {
    expect(
      firstError(milestoneItemSchema.safeParse({ ...validMilestone, fundingRequested: "" }))
    ).toBe("Milestone funding requested is required");
  });

  it("rejects empty completion criteria with the required message", () => {
    expect(
      firstError(milestoneItemSchema.safeParse({ ...validMilestone, completionCriteria: "" }))
    ).toBe("Completion criteria is required");
  });
});

describe("metricItemSchema", () => {
  const validMetric = {
    metric: "MAU",
    dataSource: "Dune",
    howItsMeasured: "Unique wallets",
    target: "10000",
  };

  it("accepts a fully filled metric", () => {
    expect(metricItemSchema.safeParse(validMetric).success).toBe(true);
  });

  it("rejects an empty metric with the required message", () => {
    expect(firstError(metricItemSchema.safeParse({ ...validMetric, metric: "" }))).toBe(
      "Metric is required"
    );
  });
});

describe("deriveRequiredMap", () => {
  it("marks only the milestone description as optional", () => {
    expect(MILESTONE_FIELD_REQUIRED).toEqual({
      title: true,
      description: false,
      dueDate: true,
      fundingRequested: true,
      completionCriteria: true,
    });
  });

  it("marks all metric fields as required", () => {
    expect(METRIC_FIELD_REQUIRED).toEqual({
      metric: true,
      dataSource: true,
      howItsMeasured: true,
      target: true,
    });
  });

  it("reflects schema changes (single source of truth)", () => {
    const map = deriveRequiredMap(milestoneItemSchema);
    expect(map.description).toBe(false);
    expect(map.title).toBe(true);
  });
});
