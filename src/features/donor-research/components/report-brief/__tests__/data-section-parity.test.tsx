import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { COMMENT_SECTION_KEYS } from "@/src/features/donor-research/components/anchor/types";
import type { ResearchReportCandidate, ResearchReportDetail } from "@/types/donor-research";
import parityFixture from "../__fixtures__/parity-fixture.json";
import { ReportBrief } from "../ReportBrief";

/**
 * Anchor-parity guard (redesign spec 2.1 + phase P3 exit criteria).
 *
 * Donor comments resolve against `data-section` attributes (see
 * `anchor/types.ts` and `shared-view/AnchoredAffordances.tsx`) — every
 * value in `COMMENT_SECTION_KEYS` MUST still be present verbatim
 * somewhere in the rendered brief, or existing comments on live reports
 * stop resolving. Reuses the DEV-418 scoring parity fixture's candidate
 * shapes (`__fixtures__/parity-fixture.json`) purely as a convenient
 * source of distinct, realistic component scores — this test does not
 * assert on ranking math (see `scoring.test.ts` for that).
 */

function toCandidate(
  raw: (typeof parityFixture.candidates)[number],
  featuredFlag: boolean
): ResearchReportCandidate {
  return {
    id: raw.id,
    fundingOrganizationId: raw.fundingOrganizationId,
    organizationName: `Sample Nonprofit ${raw.id.toUpperCase()}`,
    organizationDescription: "Runs community programs across the region.",
    organizationCity: "Springfield",
    organizationState: "IL",
    organizationWebsiteUrl: "https://example.org",
    ein: raw.ein,
    composite: 0.5,
    components: raw.components,
    featuredFlag,
    manualPosition: null,
    complianceVerdict: "verified",
    disqualificationReasons: [],
    complianceChecks: [],
    recentMentions: [],
    stateRegistrationStatus: "not_verified",
    activitySignalStatus: "no_signal",
    websiteLastUpdatedAt: null,
    socialLastPostAt: null,
    socialMetrics: null,
    reasoningSummary: "Strong alignment with the stated criteria.",
    onePagerText: null,
    detailedText: null,
    financials: [],
  };
}

function buildReport(): ResearchReportDetail {
  // First two candidates featured => a lead + one runner-up (so
  // "runners-up" renders); the rest fall into "also considered" (so that
  // section renders too) and, with >=2 featured, "comparison" renders.
  const candidates = parityFixture.candidates.map((c, i) => toCandidate(c, i < 2));
  return {
    id: "report-parity-0000",
    advisorId: "advisor-1",
    donorHandleId: "handle-1",
    donorHandleLabel: "Test Donor",
    criteriaId: "criteria-1",
    criteria: {
      criteriaText: "Fund youth literacy nonprofits in the Midwest.",
      cause: "Education",
      geography: "Illinois",
      amountMin: 10_000,
      amountMax: 50_000,
    },
    mode: "fast",
    status: "complete",
    hasShareToken: false,
    shareToken: null,
    shareTokenExpiresAt: null,
    errorMessage: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    fastCompletedAt: "2026-01-01T00:10:00.000Z",
    completedAt: "2026-01-01T00:10:00.000Z",
    geographyDiagnostic: null,
    weights: parityFixture.defaultWeights,
    topCount: 2,
    candidates,
  };
}

describe("ReportBrief data-section anchor parity", () => {
  it("renders every COMMENT_SECTION_KEYS value as a data-section attribute", () => {
    const { container } = render(<ReportBrief isTerminal report={buildReport()} variant="staff" />);

    for (const key of COMMENT_SECTION_KEYS) {
      const el = container.querySelector(`[data-section="${key}"]`);
      expect(el, `expected an element with data-section="${key}"`).not.toBeNull();
    }
  });

  it("keeps data-brief on the root and data-candidate-id on every featured candidate", () => {
    const report = buildReport();
    const { container } = render(<ReportBrief isTerminal report={report} variant="staff" />);

    expect(container.querySelector("[data-brief]")).not.toBeNull();

    const featured = report.candidates.filter((c) => c.featuredFlag);
    for (const candidate of featured) {
      expect(
        container.querySelector(`[data-candidate-id="${candidate.id}"]`),
        `expected a data-candidate-id for featured candidate ${candidate.id}`
      ).not.toBeNull();
    }
  });

  it("moves the report number into the quiet inline summary", () => {
    render(<ReportBrief isTerminal report={buildReport()} variant="staff" />);

    expect(screen.queryByText("Fast complete")).not.toBeInTheDocument();

    const summary = screen.getByLabelText("Report summary");
    expect(summary).toHaveAttribute("aria-label", "Report summary");
    expect(summary).toHaveClass("flex", "px-4", "py-3");
    expect(within(summary).getByText("No.")).toBeInTheDocument();
    expect(within(summary).getByText("REPORT")).toBeInTheDocument();
    expect(within(summary).getByText("Fast")).toBeInTheDocument();
    expect(within(summary).getByText("January 1, 2026")).toBeInTheDocument();
  });
});
