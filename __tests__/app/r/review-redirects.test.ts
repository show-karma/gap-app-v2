import { notFound, redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveCommunitySlug } from "@/app/r/_lib/resolve-review-redirect";
import ApplicationReviewRedirectPage from "@/app/r/application-review/page";
import MilestoneReviewRedirectPage from "@/app/r/milestone-review/page";

vi.mock("@/utilities/whitelabel-server", () => ({
  getWhitelabelContext: vi.fn().mockResolvedValue({ isWhitelabel: false, communitySlug: null }),
  buildWhitelabelRedirectPath: vi.fn((path: string) => path),
}));

function mockFetchOnce(value: { ok: boolean; body?: unknown }) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: value.ok,
    json: async () => value.body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
  // notFound() throws in production to halt rendering; mirror that so the
  // page under test stops at the guard instead of falling through.
  (notFound as ReturnType<typeof vi.fn>).mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  });
});

describe("resolveCommunitySlug", () => {
  it("should_return_the_community_slug_when_the_program_resolves", async () => {
    mockFetchOnce({ ok: true, body: { communitySlug: "filecoin" } });

    expect(await resolveCommunitySlug("992")).toBe("filecoin");
  });

  it("should_unwrap_an_enveloped_response", async () => {
    mockFetchOnce({ ok: true, body: { data: { communitySlug: "optimism" } } });

    expect(await resolveCommunitySlug("992")).toBe("optimism");
  });

  it("should_normalize_a_composite_program_id_before_lookup", async () => {
    mockFetchOnce({ ok: true, body: { communitySlug: "filecoin" } });

    await resolveCommunitySlug("992_42161");

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("/v2/funding-program-configs/992");
    expect(calledUrl).not.toContain("992_42161");
  });

  it("should_return_null_when_the_program_is_not_found", async () => {
    mockFetchOnce({ ok: false });

    expect(await resolveCommunitySlug("992")).toBeNull();
  });

  it("should_return_null_when_the_request_throws", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("network"));

    expect(await resolveCommunitySlug("992")).toBeNull();
  });
});

describe("app/r/milestone-review redirect", () => {
  it("should_redirect_to_the_canonical_milestone_page", async () => {
    mockFetchOnce({ ok: true, body: { communitySlug: "filecoin" } });

    await MilestoneReviewRedirectPage({
      searchParams: Promise.resolve({
        programId: "992_42161",
        projectUID: "0xproj",
      }),
    });

    expect(redirect).toHaveBeenCalledWith(
      "/community/filecoin/manage/funding-platform/992/milestones/0xproj"
    );
  });

  it("should_pass_the_milestone_anchor_through", async () => {
    mockFetchOnce({ ok: true, body: { communitySlug: "filecoin" } });

    await MilestoneReviewRedirectPage({
      searchParams: Promise.resolve({
        programId: "992",
        projectUID: "0xproj",
        milestoneUID: "0xms",
      }),
    });

    expect(redirect).toHaveBeenCalledWith(
      "/community/filecoin/manage/funding-platform/992/milestones/0xproj#milestone-0xms"
    );
  });

  it("should_notFound_when_required_params_are_missing", async () => {
    await expect(
      MilestoneReviewRedirectPage({
        searchParams: Promise.resolve({ programId: "992" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should_notFound_when_the_community_cannot_be_resolved", async () => {
    mockFetchOnce({ ok: false });

    await expect(
      MilestoneReviewRedirectPage({
        searchParams: Promise.resolve({ programId: "992", projectUID: "0xp" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("app/r/application-review redirect", () => {
  it("should_redirect_to_the_canonical_application_page", async () => {
    mockFetchOnce({ ok: true, body: { communitySlug: "filecoin" } });

    await ApplicationReviewRedirectPage({
      searchParams: Promise.resolve({
        programId: "992",
        referenceNumber: "APP-ABC-123",
      }),
    });

    expect(redirect).toHaveBeenCalledWith(
      "/community/filecoin/manage/funding-platform/992/applications/APP-ABC-123"
    );
  });

  it("should_notFound_when_the_reference_number_is_missing", async () => {
    await expect(
      ApplicationReviewRedirectPage({
        searchParams: Promise.resolve({ programId: "992" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
  });
});
