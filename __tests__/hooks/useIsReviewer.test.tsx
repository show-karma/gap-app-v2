/**
 * Tests for the reviewer permission matching logic.
 *
 * Note: The usePermissions module has a pre-existing SWC transpilation issue
 * that prevents direct hook testing (only the last export is available).
 * These tests verify the core matching logic extracted from the hook, and
 * integration testing is covered by useCanVerifyMilestone.test.tsx which
 * mocks useIsReviewer at the boundary.
 */

import type { FundingProgram } from "@/services/fundingPlatformService";

/**
 * Extracted from usePermissions hook - the logic that determines if a user
 * is a reviewer for a specific program given the list of their reviewer programs.
 */
function isReviewerForProgram(programs: Array<{ programId: string }>, programId?: string): boolean {
  if (!programId) return programs.length > 0;

  return programs.some((p) => {
    const pid = p.programId;
    if (!pid) return false;
    const normalizedPid = pid.toLowerCase();
    const normalizedTarget = programId.toLowerCase();
    // Match exact ID or ID with chain suffix (e.g. "id_chainId")
    return (
      normalizedPid === normalizedTarget ||
      normalizedTarget.startsWith(`${normalizedPid}_`) ||
      normalizedPid.startsWith(`${normalizedTarget}_`)
    );
  });
}

describe("isReviewerForProgram matching logic", () => {
  it("matches exact programId", () => {
    const programs = [{ programId: "program-123" }];
    expect(isReviewerForProgram(programs, "program-123")).toBe(true);
  });

  it("does not match a different programId", () => {
    const programs = [{ programId: "program-999" }];
    expect(isReviewerForProgram(programs, "program-123")).toBe(false);
  });

  it("returns true when no programId and user has programs", () => {
    const programs = [{ programId: "program-999" }];
    expect(isReviewerForProgram(programs)).toBe(true);
  });

  it("returns false when no programs", () => {
    expect(isReviewerForProgram([], "program-123")).toBe(false);
  });

  it("returns false when no programs and no programId", () => {
    expect(isReviewerForProgram([])).toBe(false);
  });

  it("handles case-insensitive matching", () => {
    const programs = [{ programId: "Program-ABC" }];
    expect(isReviewerForProgram(programs, "program-abc")).toBe(true);
  });

  it("matches programId with chain suffix (target has suffix)", () => {
    const programs = [{ programId: "program-123" }];
    expect(isReviewerForProgram(programs, "program-123_42161")).toBe(true);
  });

  it("matches programId with chain suffix (source has suffix)", () => {
    const programs = [{ programId: "program-123_42161" }];
    expect(isReviewerForProgram(programs, "program-123")).toBe(true);
  });

  it("does not match partial programId overlap", () => {
    const programs = [{ programId: "program-12" }];
    expect(isReviewerForProgram(programs, "program-123")).toBe(false);
  });

  it("matches among multiple programs", () => {
    const programs = [
      { programId: "program-111" },
      { programId: "program-222" },
      { programId: "program-333" },
    ];
    expect(isReviewerForProgram(programs, "program-222")).toBe(true);
  });

  it("handles programs with no programId field", () => {
    const programs = [{ programId: "" }];
    expect(isReviewerForProgram(programs, "program-123")).toBe(false);
  });
});
