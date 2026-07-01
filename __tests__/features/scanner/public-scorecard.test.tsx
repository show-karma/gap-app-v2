import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicScorecard } from "@/src/features/scanner/components/public-scorecard";
import { useScorecardBySlug } from "@/src/features/scanner/hooks/use-scorecard-by-slug";
import type { PublicScorecardPayload } from "@/src/features/scanner/types";

// The bug this guards: while a just-submitted scan is still generating, the
// public slug endpoint 404s, and the page used to render a "could not load"
// error and stop polling. It must show a generating state instead, and only
// surface the error once the query has genuinely given up.
vi.mock("@/src/features/scanner/hooks/use-scorecard-by-slug", () => ({
  useScorecardBySlug: vi.fn(),
}));

// The finished-scorecard branch renders the members-area CTA, which pulls in
// auth/router context. It's covered by its own test — stub it here so this
// suite stays focused on PublicScorecard's own state routing.
vi.mock("@/src/features/scanner/components/members-area-cta", () => ({
  MembersAreaCta: () => null,
}));

const mockHook = vi.mocked(useScorecardBySlug);

function hookState(overrides: Partial<ReturnType<typeof useScorecardBySlug>>) {
  return {
    data: undefined,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useScorecardBySlug>;
}

const completeScorecard: PublicScorecardPayload = {
  scanId: "scan-1",
  slug: "slug-1",
  totalScore: 98,
  grade: "A",
  categoryScores: [],
  summary: null,
  ogImageUrl: null,
  unknowns: { errorCheckIds: [], pendingCheckIds: [], notAttemptedCheckIds: [] },
  orgName: "GiveDirectly, Inc.",
  url: "https://example.org/",
  status: "complete",
  rubricVersion: "v1.1",
  startedAt: "2026-07-01T00:00:00.000Z",
  finishedAtConfig: "2026-07-01T00:00:05.000Z",
  finishedAtComplete: "2026-07-01T00:00:20.000Z",
};

describe("PublicScorecard", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.clearAllMocks());

  it("shows a generating state (not an error) while the scan is still pending", () => {
    mockHook.mockReturnValue(hookState({ data: undefined, isError: false }));
    render(<PublicScorecard slug="slug-1" />);

    expect(screen.getByText(/generating your report/i)).toBeInTheDocument();
    expect(screen.queryByText(/could not load this scorecard/i)).not.toBeInTheDocument();
  });

  it("keeps showing the generating state for a non-terminal scored payload", () => {
    mockHook.mockReturnValue(
      hookState({ data: { ...completeScorecard, status: "running_agent" }, isError: false })
    );
    render(<PublicScorecard slug="slug-1" />);

    // Non-terminal -> generating view (scoped to org), and NOT the finished
    // scorecard footer.
    expect(screen.getByText(/scoring givedirectly/i)).toBeInTheDocument();
    expect(screen.queryByText(/Karma AI-Readiness Checker/i)).not.toBeInTheDocument();
  });

  it("surfaces the error only once the query has given up with no data", () => {
    mockHook.mockReturnValue(hookState({ data: undefined, isError: true }));
    render(<PublicScorecard slug="slug-1" />);

    expect(screen.getByText(/could not load this scorecard/i)).toBeInTheDocument();
    expect(screen.queryByText(/generating your report/i)).not.toBeInTheDocument();
  });

  it("renders the finished scorecard when the scan is complete", () => {
    mockHook.mockReturnValue(hookState({ data: completeScorecard, isError: false }));
    render(<PublicScorecard slug="slug-1" />);

    // Footer only renders on the finished scorecard article.
    expect(screen.getByText(/Karma AI-Readiness Checker/i)).toBeInTheDocument();
    expect(screen.queryByText(/generating your report/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/could not load this scorecard/i)).not.toBeInTheDocument();
  });
});
