import "@testing-library/jest-dom";

/**
 * Smoke tests for redirect-only pages. Each page invokes Next's redirect()
 * or permanentRedirect() helpers — we mock them to throw a sentinel and
 * assert the page invokes them with the expected target.
 */

const redirectMock = vi.fn((url: string) => {
  const err = new Error(`NEXT_REDIRECT:${url}`) as Error & { digest: string };
  err.digest = `NEXT_REDIRECT;${url}`;
  throw err;
});
const permanentRedirectMock = vi.fn((url: string) => {
  const err = new Error(`NEXT_PERMANENT_REDIRECT:${url}`) as Error & { digest: string };
  err.digest = `NEXT_REDIRECT;${url};308`;
  throw err;
});
const notFoundMock = vi.fn(() => {
  const err = new Error("NEXT_NOT_FOUND") as Error & { digest: string };
  err.digest = "NEXT_NOT_FOUND";
  throw err;
});

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("next/navigation");
  return {
    ...actual,
    redirect: redirectMock,
    permanentRedirect: permanentRedirectMock,
    notFound: notFoundMock,
  };
});

vi.mock("@/utilities/whitelabel-server", () => ({
  getWhitelabelContext: vi.fn().mockResolvedValue({ isWhitelabel: false }),
  buildWhitelabelRedirectPath: vi.fn((path: string) => path),
}));

beforeEach(() => {
  redirectMock.mockClear();
  permanentRedirectMock.mockClear();
  notFoundMock.mockClear();
});

describe("Redirect-only pages", () => {
  it("/admin/communities redirects to /admin", async () => {
    const { default: Page } = await import("@/app/admin/communities/page");
    expect(() => Page()).toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/admin");
  });

  it("/(whitelabel)/applications redirects to /dashboard", async () => {
    const { default: Page } = await import(
      "@/app/community/[communityId]/(whitelabel)/applications/page"
    );
    await expect(Page()).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("/(whitelabel)/programs redirects to community funding-opportunities", async () => {
    const { default: Page } = await import(
      "@/app/community/[communityId]/(whitelabel)/programs/page"
    );
    await expect(Page({ params: Promise.resolve({ communityId: "abc" }) })).rejects.toThrow(
      /NEXT_REDIRECT/
    );
    expect(redirectMock).toHaveBeenCalledWith("/community/abc/funding-opportunities");
  });

  it("/manage/funding-platform/[programId] redirects to question-builder", async () => {
    const { default: Page } = await import(
      "@/app/community/[communityId]/manage/funding-platform/[programId]/page"
    );
    await expect(
      Page({ params: Promise.resolve({ communityId: "c1", programId: "p1" }) })
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledTimes(1);
    const target = redirectMock.mock.calls[0][0] as string;
    expect(target).toContain("c1");
    expect(target).toContain("p1");
  });

  it("/manage/funding-platform/[programId]/milestones redirects", async () => {
    const { default: Page } = await import(
      "@/app/community/[communityId]/manage/funding-platform/[programId]/milestones/page"
    );
    await expect(Page({ params: Promise.resolve({ communityId: "c1" }) })).rejects.toThrow(
      /NEXT_REDIRECT/
    );
    expect(redirectMock).toHaveBeenCalledTimes(1);
  });

  it("/manage/payouts permanent-redirects to control-center", async () => {
    const { default: Page } = await import("@/app/community/[communityId]/manage/payouts/page");
    await expect(
      Page({
        params: Promise.resolve({ communityId: "c1" }),
        searchParams: Promise.resolve({ tab: "next" }),
      })
    ).rejects.toThrow(/NEXT_PERMANENT_REDIRECT/);
    expect(permanentRedirectMock).toHaveBeenCalledTimes(1);
    const target = permanentRedirectMock.mock.calls[0][0] as string;
    expect(target).toContain("c1");
    expect(target).toContain("tab=next");
  });

  it("/(with-header)/browse-applications/[referenceNumber] permanent-redirects", async () => {
    const { default: Page } = await import(
      "@/app/community/[communityId]/(with-header)/browse-applications/[referenceNumber]/page"
    );
    await expect(
      Page({ params: Promise.resolve({ communityId: "c1", referenceNumber: "AB123" }) })
    ).rejects.toThrow(/NEXT_PERMANENT_REDIRECT/);
    expect(permanentRedirectMock).toHaveBeenCalledTimes(1);
    const target = permanentRedirectMock.mock.calls[0][0] as string;
    expect(target).toContain("AB123");
  });
});
