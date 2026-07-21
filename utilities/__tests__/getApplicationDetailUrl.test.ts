import { describe, expect, it, vi } from "vitest";

// getApplicationDetailUrl consults NEXT_PUBLIC_FUNDING_PLATFORM_EXTERNAL_LINKS
// before the hostname check, so pin it off to keep the same-origin assertion
// deterministic regardless of the ambient CI/test env.
vi.mock("@/utilities/enviromentVars", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utilities/enviromentVars")>();
  return {
    ...actual,
    envVars: { ...actual.envVars, NEXT_PUBLIC_FUNDING_PLATFORM_EXTERNAL_LINKS: "false" },
  };
});

import { getApplicationDetailUrl } from "@/utilities/fundingPlatformUrls";

describe("getApplicationDetailUrl", () => {
  it("returns the same-origin community route when there is no whitelabel origin (local/dev)", () => {
    // jsdom runs on localhost, so external links are disabled and links stay same-origin.
    expect(getApplicationDetailUrl("optimism", "REF-1")).toBe(
      "/community/optimism/applications/REF-1"
    );
  });

  it("keeps the redirect on the tenant domain when a whitelabel origin is provided", () => {
    expect(getApplicationDetailUrl("optimism", "REF-1", "https://grants.optimism.io")).toBe(
      "https://grants.optimism.io/applications/REF-1"
    );
  });

  it("keys the URL by the reference number it is given", () => {
    expect(getApplicationDetailUrl("filecoin", "ABC-123", "https://app.filpgf.io")).toContain(
      "/applications/ABC-123"
    );
  });

  // DEV-496: the reference number alone is canonical (globally unique); only a
  // view `tab` may ride along — never a programId.
  it("appends a tab when provided (same-origin)", () => {
    expect(getApplicationDetailUrl("optimism", "REF-1", undefined, { tab: "milestones" })).toBe(
      "/community/optimism/applications/REF-1?tab=milestones"
    );
  });

  it("appends the tab on the tenant domain", () => {
    expect(
      getApplicationDetailUrl("filecoin", "ABC-123", "https://app.filpgf.io", {
        tab: "milestones",
      })
    ).toBe("https://app.filpgf.io/applications/ABC-123?tab=milestones");
  });

  it("omits the query when context is empty", () => {
    expect(getApplicationDetailUrl("optimism", "REF-1", undefined, {})).toBe(
      "/community/optimism/applications/REF-1"
    );
  });
});
