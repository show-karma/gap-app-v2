import { describe, expect, it } from "vitest";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";
import { buildMilestoneSchema } from "../milestone-schema";

const FUTURE_DATE = `${new Date().getFullYear() + 1}-01-01`;

const baseQuestion: ApplicationQuestion = {
  id: "milestones",
  type: "milestone",
  label: "Project Milestones",
  required: true,
};

const validMilestone = {
  title: "Ship MVP",
  description: "Build and release the initial product",
  dueDate: FUTURE_DATE,
  fundingRequested: "$10,000 USD",
  completionCriteria: "Production deploy + monitoring live",
};

describe("buildMilestoneSchema — required sub-fields", () => {
  it("accepts a milestone with all required fields populated", () => {
    const schema = buildMilestoneSchema(baseQuestion);

    const result = schema.safeParse([validMilestone]);

    expect(result.success).toBe(true);
  });

  it("rejects a milestone with empty fundingRequested", () => {
    const schema = buildMilestoneSchema(baseQuestion);

    const result = schema.safeParse([{ ...validMilestone, fundingRequested: "" }]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).toContain(
        "Milestone funding requested is required"
      );
    }
  });

  it("rejects a milestone with empty completionCriteria", () => {
    const schema = buildMilestoneSchema(baseQuestion);

    const result = schema.safeParse([{ ...validMilestone, completionCriteria: "" }]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).toContain("Completion criteria is required");
    }
  });

  it("rejects a milestone missing fundingRequested entirely", () => {
    const schema = buildMilestoneSchema(baseQuestion);
    const { fundingRequested: _drop, ...withoutFunding } = validMilestone;

    const result = schema.safeParse([withoutFunding]);

    expect(result.success).toBe(false);
  });

  it("rejects a milestone missing completionCriteria entirely", () => {
    const schema = buildMilestoneSchema(baseQuestion);
    const { completionCriteria: _drop, ...withoutCriteria } = validMilestone;

    const result = schema.safeParse([withoutCriteria]);

    expect(result.success).toBe(false);
  });

  it("accepts a milestone with an empty description (#1179)", () => {
    const schema = buildMilestoneSchema(baseQuestion);

    const result = schema.safeParse([{ ...validMilestone, description: "" }]);

    expect(result.success).toBe(true);
  });

  it("accepts a milestone missing description entirely (#1179)", () => {
    const schema = buildMilestoneSchema(baseQuestion);
    const { description: _drop, ...withoutDescription } = validMilestone;

    const result = schema.safeParse([withoutDescription]);

    expect(result.success).toBe(true);
  });

  it("applies required sub-field validation even on optional milestone arrays", () => {
    // When the milestone field is itself optional but a user adds a
    // milestone, the new row's sub-fields must still meet the schema.
    const schema = buildMilestoneSchema({ ...baseQuestion, required: false });

    const result = schema.safeParse([{ ...validMilestone, fundingRequested: "" }]);

    expect(result.success).toBe(false);
  });

  it("accepts an empty array when the milestone field is optional", () => {
    const schema = buildMilestoneSchema({ ...baseQuestion, required: false });

    const result = schema.safeParse([]);

    expect(result.success).toBe(true);
  });
});
