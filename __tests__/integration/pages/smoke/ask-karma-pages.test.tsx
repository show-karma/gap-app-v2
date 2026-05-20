import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Smoke tests for the ask-karma routes (root and community). The inner
 * `AskKarmaPage` is mocked to a sentinel so we test only that the server
 * components correctly resolve their tenant/community context and pass
 * the right config down.
 */

const askKarmaPageSpy = vi.fn();

vi.mock("@/src/features/ask-karma/components/ask-karma-page", () => ({
  AskKarmaPage: (props: { config: { heading: string }; communityId?: string }) => {
    askKarmaPageSpy(props);
    return (
      <div
        data-testid="ask-karma-page"
        data-community-id={props.communityId ?? ""}
        data-heading={props.config.heading}
      >
        AskKarmaPage
      </div>
    );
  },
}));

const mockCommunity = {
  uid: "0x123",
  details: { name: "Filecoin", slug: "filecoin" },
};

vi.mock("@/utilities/queries/v2/getCommunityData", () => ({
  getCommunityDetails: vi.fn().mockResolvedValue(mockCommunity),
}));

const mockGetWhitelabelContext = vi.fn().mockResolvedValue({
  isWhitelabel: false,
  communitySlug: null,
  config: null,
  tenantConfig: { id: "karma", name: "Karma" },
});

vi.mock("@/utilities/whitelabel-server", () => ({
  getWhitelabelContext: () => mockGetWhitelabelContext(),
}));

const renderAsyncPage = async (
  importer: () => Promise<{ default: (props: unknown) => Promise<React.ReactElement> }>,
  props: unknown
) => {
  const { default: Page } = await importer();
  const result = await Page(props);
  return render(result);
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWhitelabelContext.mockResolvedValue({
    isWhitelabel: false,
    communitySlug: null,
    config: null,
    tenantConfig: { id: "karma", name: "Karma" },
  });
});

describe("/ask-karma (root) page", () => {
  it("renders AskKarmaPage with the default config when not on a whitelabel", async () => {
    await renderAsyncPage(() => import("@/app/ask-karma/page"), {});
    expect(screen.getByTestId("ask-karma-page")).toBeInTheDocument();
    expect(screen.getByTestId("ask-karma-page")).toHaveAttribute("data-heading", "Ask us anything");
    expect(askKarmaPageSpy).toHaveBeenCalled();
    const props = askKarmaPageSpy.mock.calls[0][0];
    expect(props.communityId).toBeUndefined();
  });

  it("passes the whitelabel community id and tenant-specific config when on a whitelabel domain", async () => {
    mockGetWhitelabelContext.mockResolvedValueOnce({
      isWhitelabel: true,
      communitySlug: "filecoin",
      config: { domain: "app.filpgf.io", communitySlug: "filecoin", tenantId: "filecoin" },
      tenantConfig: { id: "filecoin", name: "Filecoin" },
    });
    await renderAsyncPage(() => import("@/app/ask-karma/page"), {});
    const props = askKarmaPageSpy.mock.calls[0][0];
    expect(props.communityId).toBe("filecoin");
    // Filecoin gets the bespoke config — the heading still says "Ask us
    // anything" but the example questions array differs from the default.
    expect(props.config.exampleQuestions.some((q: string) => q.includes("fil.one"))).toBe(true);
  });

  it("metadata is static 'Ask Karma' even on a whitelabel surface", async () => {
    // Tenant-agnostic by design: the agent is Karma regardless of
    // which whitelabel the user arrived on. The on-page chrome still
    // uses the community's branding — only the page metadata is fixed.
    const { metadata } = await import("@/app/ask-karma/page");
    expect(metadata.title).toBe("Ask Karma");
    expect(metadata.alternates?.canonical).toBe("/ask-karma");
    // Rule: no tenant-name interpolation in the description. "Karma" is
    // intentionally NOT in this list — it's the product name, not a tenant,
    // and is allowed in copy ("Ask Karma about …", etc.).
    expect(metadata.description).not.toMatch(/Filecoin|Optimism/i);
  });
});

describe("/community/[communityId]/ask-karma (community) page", () => {
  it("renders AskKarmaPage with the community id from params", async () => {
    await renderAsyncPage(
      () => import("@/app/community/[communityId]/(with-header)/ask-karma/page"),
      { params: Promise.resolve({ communityId: "filecoin" }) }
    );
    expect(screen.getByTestId("ask-karma-page")).toBeInTheDocument();
    expect(screen.getByTestId("ask-karma-page")).toHaveAttribute("data-community-id", "filecoin");
    const props = askKarmaPageSpy.mock.calls[0][0];
    expect(props.config.exampleQuestions.some((q: string) => q.includes("fil.one"))).toBe(true);
  });

  it("calls notFound when the community cannot be resolved", async () => {
    // Re-mock to return a missing community.
    vi.doMock("@/utilities/queries/v2/getCommunityData", () => ({
      getCommunityDetails: vi.fn().mockResolvedValue(null),
    }));
    vi.resetModules();

    const notFound = vi.fn(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    vi.doMock("next/navigation", () => ({
      notFound,
    }));

    await expect(
      renderAsyncPage(() => import("@/app/community/[communityId]/(with-header)/ask-karma/page"), {
        params: Promise.resolve({ communityId: "unknown" }),
      })
    ).rejects.toThrow();

    expect(notFound).toHaveBeenCalled();

    vi.doUnmock("@/utilities/queries/v2/getCommunityData");
    vi.doUnmock("next/navigation");
  });

  it("generateMetadata returns the static 'Ask Karma' title with a community-scoped canonical", async () => {
    // Title is intentionally tenant-agnostic; only the canonical URL
    // changes per community so search engines can dedupe per surface.
    vi.resetModules();
    vi.doMock("@/utilities/queries/v2/getCommunityData", () => ({
      getCommunityDetails: vi
        .fn()
        .mockResolvedValue({ uid: "0x123", details: { name: "Filecoin", slug: "filecoin" } }),
    }));
    const { generateMetadata } = await import(
      "@/app/community/[communityId]/(with-header)/ask-karma/page"
    );
    const meta = await generateMetadata({
      params: Promise.resolve({ communityId: "filecoin" }),
    });
    expect(meta.title).toBe("Ask Karma");
    expect(meta.alternates?.canonical).toBe("/community/filecoin/ask-karma");
    expect(meta.description).not.toMatch(/Filecoin/i);
    vi.doUnmock("@/utilities/queries/v2/getCommunityData");
  });
});
