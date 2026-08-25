import { describe, expect, it } from "vitest";
import { findGrantRowToOpen } from "@/components/Pages/Admin/ControlCenter/findGrantRowToOpen";

const rows = [
  { grantUid: "grant-batch-3", projectSlug: "filecoin-infra" },
  { grantUid: "grant-batch-2", projectSlug: "filecoin-infra" },
  { grantUid: "grant-other", projectSlug: "other-project" },
];

describe("findGrantRowToOpen", () => {
  it("should_return_the_exact_grant_row_when_grant_param_matches", () => {
    const match = findGrantRowToOpen(rows, "filecoin-infra", "grant-batch-2");

    expect(match?.grantUid).toBe("grant-batch-2");
  });

  it("should_fall_back_to_first_row_for_slug_when_grant_param_is_absent", () => {
    const match = findGrantRowToOpen(rows, "filecoin-infra");

    expect(match?.grantUid).toBe("grant-batch-3");
  });

  it("should_fall_back_to_first_row_for_slug_when_grant_param_does_not_match", () => {
    const match = findGrantRowToOpen(rows, "filecoin-infra", "grant-missing");

    expect(match?.grantUid).toBe("grant-batch-3");
  });

  it("should_return_undefined_when_no_row_has_the_slug", () => {
    const match = findGrantRowToOpen(rows, "unknown", "grant-batch-2");

    expect(match).toBeUndefined();
  });
});
