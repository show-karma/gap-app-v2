import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PAGES } from "@/utilities/pages";

/**
 * Issue #1312: bare `/community` 404'd because no `app/community/page.tsx` existed (the
 * listing lives at `/communities`). The fix adds a server component that permanently
 * redirects `/community` to the community listing.
 */

// `permanentRedirect` throws internally in Next to halt rendering; capture the target instead.
const permanentRedirectMock = vi.fn((url: string) => {
  throw new Error(`PERMANENT_REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  permanentRedirect: (url: string) => permanentRedirectMock(url),
}));

describe("issue #1312 — /community route", () => {
  it("the route file exists on disk", () => {
    const routeFile = path.resolve(__dirname, "..", "..", "app", "community", "page.tsx");
    expect(existsSync(routeFile)).toBe(true);
  });

  it("permanently redirects to the community listing page", async () => {
    const { default: CommunityIndexPage } = await import("@/app/community/page");

    expect(() => CommunityIndexPage()).toThrow(`PERMANENT_REDIRECT:${PAGES.COMMUNITIES}`);
    expect(permanentRedirectMock).toHaveBeenCalledWith(PAGES.COMMUNITIES);
    expect(PAGES.COMMUNITIES).toBe("/communities");
  });
});
