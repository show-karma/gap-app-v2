/**
 * @file Regression test for the milestone form's zod refine path fix.
 * `dates` is a nested object with its own `.refine()`; a `path: ["dates", "startsAt"]`
 * resolves *relative to the refine's own object* to `dates.dates.startsAt`, which
 * `formState.errors.dates?.startsAt?.message` in Milestone.tsx can never reach —
 * the error silently never renders. The fix changed the path to `["startsAt"]`,
 * which correctly resolves to `dates.startsAt`. This test locks that by asserting
 * the exact `issue.path` produced by a start-after-end violation.
 */

import { milestoneSchema } from "@/components/Forms/Milestone.schema";

describe("milestoneSchema (dates refine)", () => {
  it("fails when startsAt is after endsAt, with the issue path resolving to dates.startsAt", () => {
    const result = milestoneSchema.safeParse({
      title: "Ship the thing",
      dates: {
        startsAt: new Date("2026-02-01T00:00:00Z"),
        endsAt: new Date("2026-01-01T00:00:00Z"),
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    const datesIssue = result.error.issues.find((issue) => issue.path[0] === "dates");
    expect(datesIssue).toBeDefined();
    // The regression: this must be ["dates", "startsAt"] (-> dates.startsAt),
    // NOT ["dates", "dates", "startsAt"] (-> dates.dates.startsAt, unreachable
    // via formState.errors.dates?.startsAt in the form component).
    expect(datesIssue?.path).toEqual(["dates", "startsAt"]);
    expect(datesIssue?.message).toBe("Start date must be before the end date");
  });

  it("passes when startsAt is before endsAt", () => {
    const result = milestoneSchema.safeParse({
      title: "Ship the thing",
      dates: {
        startsAt: new Date("2026-01-01T00:00:00Z"),
        endsAt: new Date("2026-02-01T00:00:00Z"),
      },
    });

    expect(result.success).toBe(true);
  });

  it("passes when startsAt is equal to endsAt", () => {
    const sameInstant = new Date("2026-01-01T00:00:00Z");
    const result = milestoneSchema.safeParse({
      title: "Ship the thing",
      dates: {
        startsAt: sameInstant,
        endsAt: sameInstant,
      },
    });

    expect(result.success).toBe(true);
  });

  it("passes when startsAt is omitted (optional) and endsAt is present", () => {
    const result = milestoneSchema.safeParse({
      title: "Ship the thing",
      dates: {
        endsAt: new Date("2026-02-01T00:00:00Z"),
      },
    });

    expect(result.success).toBe(true);
  });

  it("fails when endsAt is missing (required)", () => {
    const result = milestoneSchema.safeParse({
      title: "Ship the thing",
      dates: {
        startsAt: new Date("2026-01-01T00:00:00Z"),
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const endsAtIssue = result.error.issues.find(
      (issue) => issue.path[0] === "dates" && issue.path[1] === "endsAt"
    );
    expect(endsAtIssue).toBeDefined();
  });

  it("treats priority as optional", () => {
    const result = milestoneSchema.safeParse({
      title: "Ship the thing",
      dates: {
        endsAt: new Date("2026-02-01T00:00:00Z"),
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBeUndefined();
    }
  });

  it("fails when title is too short", () => {
    const result = milestoneSchema.safeParse({
      title: "ab",
      dates: {
        endsAt: new Date("2026-02-01T00:00:00Z"),
      },
    });

    expect(result.success).toBe(false);
  });
});
