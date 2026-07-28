import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/__tests__/utils/render";
import type { ResearchReportCandidate, ResearchReportDetail } from "@/types/donor-research";
import parityFixture from "../__fixtures__/parity-fixture.json";
import { ReportBrief } from "../ReportBrief";

/**
 * The report owner and a super-admin viewing the same report must see the SAME
 * per-candidate diligence footer — the backend resolves either caller to the
 * report's advisor, so both may act. Anyone else (donor share view, a signed-in
 * non-owner) must see none.
 *
 * `CandidateDiligenceActions` is stubbed: this asserts the gating decision, not
 * the footer's own rendering (covered in `diligence/__tests__`).
 */
vi.mock("../../diligence/CandidateDiligenceActions", () => ({
  CandidateDiligenceActions: ({ viewer }: { viewer: string }) => (
    <div data-testid="diligence-actions" data-viewer={viewer} />
  ),
}));

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

function renderBrief(props: Partial<Parameters<typeof ReportBrief>[0]>) {
  return renderWithProviders(<ReportBrief isTerminal report={buildReport()} {...props} />);
}

describe("ReportBrief diligence footer parity", () => {
  it("mounts the footer for the report owner", () => {
    const { getAllByTestId } = renderBrief({ variant: "advisor", canManageReport: true });

    const footers = getAllByTestId("diligence-actions");
    expect(footers.length).toBeGreaterThan(0);
    for (const footer of footers) {
      expect(footer).toHaveAttribute("data-viewer", "owner");
    }
  });

  it("mounts the same footer for a super-admin, marked as acting on the owner's behalf", () => {
    const { getAllByTestId } = renderBrief({ variant: "staff", canManageReport: true });

    const footers = getAllByTestId("diligence-actions");
    expect(footers.length).toBeGreaterThan(0);
    for (const footer of footers) {
      expect(footer).toHaveAttribute("data-viewer", "staff");
    }
  });

  it("mounts one footer per candidate for owner and super-admin alike", () => {
    const owner = renderBrief({ variant: "advisor", canManageReport: true });
    const ownerCount = owner.getAllByTestId("diligence-actions").length;
    owner.unmount();

    const staff = renderBrief({ variant: "staff", canManageReport: true });

    expect(staff.getAllByTestId("diligence-actions")).toHaveLength(ownerCount);
  });

  it("hides the footer from a signed-in viewer who owns neither the report nor staff access", () => {
    const { queryAllByTestId } = renderBrief({ variant: "staff", canManageReport: false });

    expect(queryAllByTestId("diligence-actions")).toHaveLength(0);
  });

  it("hides the footer from the donor share view", () => {
    const { queryAllByTestId } = renderBrief({ variant: "shared" });

    expect(queryAllByTestId("diligence-actions")).toHaveLength(0);
  });
});
