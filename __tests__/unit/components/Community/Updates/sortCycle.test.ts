/**
 * Tests for getNextSort — the server-side sort cycle logic used by the
 * community Updates table headers.
 *
 * Covers:
 * - Clicking a new column starts ascending
 * - Clicking the active column flips asc -> desc and desc -> asc
 * - Switching to a different column resets to ascending
 */

import { getNextSort } from "@/components/Pages/Community/Updates/sortCycle";

describe("getNextSort", () => {
  it("starts ascending when no column is active", () => {
    expect(getNextSort("dueDate", null, "asc")).toEqual({ sortBy: "dueDate", sortOrder: "asc" });
  });

  it("flips asc -> desc when clicking the active column", () => {
    expect(getNextSort("dueDate", "dueDate", "asc")).toEqual({
      sortBy: "dueDate",
      sortOrder: "desc",
    });
  });

  it("flips desc -> asc when clicking the active column again", () => {
    expect(getNextSort("dueDate", "dueDate", "desc")).toEqual({
      sortBy: "dueDate",
      sortOrder: "asc",
    });
  });

  it("resets to ascending when switching to a different column", () => {
    expect(getNextSort("status", "dueDate", "desc")).toEqual({
      sortBy: "status",
      sortOrder: "asc",
    });
  });
});
