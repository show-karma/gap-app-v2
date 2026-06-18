import {
  PROJECT_DETAILS_COUNTER_THRESHOLD,
  PROJECT_DETAILS_MAX_LENGTH,
  projectSchema,
} from "@/components/Dialogs/ProjectDialog/schema";
import { MESSAGES } from "@/utilities/messages";

describe("projectSchema combined body length cap", () => {
  const validBase = {
    title: "Valid project",
    chainID: 42161,
    description: "d",
    problem: "p",
    solution: "s",
    missionSummary: "m",
  };

  it("caps the combined limit at 15,000 characters", () => {
    expect(PROJECT_DETAILS_MAX_LENGTH).toBe(15000);
  });

  it("surfaces the per-field counter at 10,000 characters, below the cap", () => {
    expect(PROJECT_DETAILS_COUNTER_THRESHOLD).toBe(10000);
    expect(PROJECT_DETAILS_COUNTER_THRESHOLD).toBeLessThan(PROJECT_DETAILS_MAX_LENGTH);
  });

  it("accepts the four fields when their combined length is at the limit", () => {
    const result = projectSchema.safeParse({
      ...validBase,
      // description fills the remaining budget after the 3 one-char fields.
      description: "a".repeat(PROJECT_DETAILS_MAX_LENGTH - 3),
    });
    expect(result.success).toBe(true);
  });

  it("rejects when the combined length exceeds the limit, flagging the longest field", () => {
    const result = projectSchema.safeParse({
      ...validBase,
      description: "a".repeat(PROJECT_DETAILS_MAX_LENGTH),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "description");
      expect(issue?.message).toBe(MESSAGES.PROJECT_FORM.DETAILS_MAX);
    }
  });
});
