import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MembersAreaCta } from "@/src/features/scanner/components/members-area-cta";
import { useScorecardBySlug } from "@/src/features/scanner/hooks/use-scorecard-by-slug";
import type { PublicScorecardPayload } from "@/src/features/scanner/types";

// Guards two bugs: (1) "Open full report" was enabled before the scan finished
// (the slug endpoint returns a scanId in its in-progress envelopes), and
// (2) the CTA never reflected the completion state.
const mockAuthState = { ready: true, authenticated: false, login: vi.fn(), user: undefined };
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockAuthState,
  setPostLoginRedirect: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/src/features/scanner/hooks/use-scorecard-by-slug", () => ({
  useScorecardBySlug: vi.fn(),
}));

const mockHook = vi.mocked(useScorecardBySlug);

function hookData(scorecard: PublicScorecardPayload | undefined) {
  return { data: scorecard } as unknown as ReturnType<typeof useScorecardBySlug>;
}

function card(overrides: Partial<PublicScorecardPayload>): PublicScorecardPayload {
  return {
    scanId: "scan-1",
    slug: "slug-1",
    totalScore: 98,
    grade: "A",
    categoryScores: [],
    summary: null,
    ogImageUrl: null,
    unknowns: { errorCheckIds: [], pendingCheckIds: [], notAttemptedCheckIds: [] },
    orgName: "GiveDirectly",
    url: "https://example.org/",
    status: "complete",
    rubricVersion: "v1.1",
    startedAt: "",
    finishedAtConfig: null,
    finishedAtComplete: null,
    ...overrides,
  };
}

describe("MembersAreaCta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.authenticated = false;
    mockAuthState.ready = true;
  });
  afterEach(() => vi.clearAllMocks());

  it("locks the report (no open button) while the scan is still generating", () => {
    mockHook.mockReturnValue(hookData(card({ status: "running_agent" })));
    render(<MembersAreaCta slug="slug-1" />);

    expect(screen.getByText(/full report unlocks when the scan finishes/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /open full report|log in to see the report/i })
    ).not.toBeInTheDocument();
  });

  it("prompts login when the scan is complete and the viewer is logged out", () => {
    mockHook.mockReturnValue(hookData(card({ status: "complete" })));
    render(<MembersAreaCta slug="slug-1" />);

    expect(screen.getByRole("button", { name: /log in to see the report/i })).toBeEnabled();
  });

  it("offers to open the report when complete and authenticated", () => {
    mockAuthState.authenticated = true;
    mockHook.mockReturnValue(hookData(card({ status: "complete" })));
    render(<MembersAreaCta slug="slug-1" />);

    expect(screen.getByRole("button", { name: /open full report/i })).toBeEnabled();
  });

  it("falls back to SSR initialData when the live query has no data yet", () => {
    mockHook.mockReturnValue(hookData(undefined));
    render(<MembersAreaCta slug="slug-1" initialData={card({ status: "complete" })} />);

    expect(screen.getByRole("button", { name: /log in to see the report/i })).toBeInTheDocument();
  });
});
