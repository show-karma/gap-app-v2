import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/__tests__/utils/render";
import type { ResearchReportCandidate, ResearchReportDetail } from "@/types/donor-research";
import parityFixture from "../__fixtures__/parity-fixture.json";
import { ReportBrief } from "../ReportBrief";

/**
 * INVARIANT: a super-admin sees every affordance the report owner sees.
 *
 * This test deliberately does NOT enumerate buttons. It renders the SAME report
 * twice — once as the owner, once as a super-admin acting on their behalf — and
 * asserts the two trees expose an identical set of interactive controls.
 *
 * That matters because the bug class is open-ended: any future component added
 * under `ReportBrief` that gates on `variant === "advisor"` instead of the
 * resolved `canManageReport` authorization reintroduces it, and a test that
 * listed today's buttons would still pass. This one fails the moment the two
 * renders diverge, for a control nobody has written yet.
 *
 * If a divergence is ever CORRECT, add it to `JUSTIFIED_DIFFERENCES` with a
 * reason. That list is the complete, reviewable record of where the two
 * surfaces are allowed to differ — today it is empty.
 */

vi.mock("../../diligence/CandidateDiligenceActions", () => ({
  // Rendered with the same controls for either viewer; the viewer only reaches
  // the Connect email-capture step, which is covered in diligence/__tests__.
  CandidateDiligenceActions: () => (
    <div>
      <button type="button">Ask questions</button>
      <button type="button">Connect</button>
    </div>
  ),
}));

/** Controls allowed to appear for one viewer but not the other, with why. */
const JUSTIFIED_DIFFERENCES: ReadonlyArray<{ name: string; reason: string }> = [];

const INTERACTIVE_ROLES = ["button", "link", "textbox", "checkbox", "combobox", "switch"] as const;

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

function buildReport(overrides: Partial<ResearchReportDetail> = {}): ResearchReportDetail {
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
    ...overrides,
  };
}

/** Accessible names of every interactive control, sorted and de-duplicated. */
function affordancesFor(
  variant: "advisor" | "staff",
  report: ResearchReportDetail,
  isTerminal: boolean
): string[] {
  const view = renderWithProviders(
    <ReportBrief canManageReport isTerminal={isTerminal} report={report} variant={variant} />
  );
  const names = INTERACTIVE_ROLES.flatMap((role) =>
    view
      .queryAllByRole(role)
      .map((el) => `${role}:${el.textContent?.trim() || el.getAttribute("aria-label") || ""}`)
  );
  view.unmount();
  return [...new Set(names)].sort();
}

describe("owner ↔ super-admin affordance parity", () => {
  const justified = new Set(JUSTIFIED_DIFFERENCES.map((d) => d.name));

  it.each([
    { label: "terminal report with featured candidates", report: buildReport(), isTerminal: true },
    {
      label: "terminal report where nothing was surfaced",
      report: buildReport({
        candidates: parityFixture.candidates.map((c) => toCandidate(c, false)),
      }),
      isTerminal: true,
    },
    {
      label: "failed report",
      report: buildReport({ status: "failed", errorMessage: "search failed" }),
      isTerminal: true,
    },
  ])("exposes the same controls to both viewers — $label", ({ report, isTerminal }) => {
    const owner = affordancesFor("advisor", report, isTerminal);
    const staff = affordancesFor("staff", report, isTerminal);

    const missingForStaff = owner.filter((n) => !staff.includes(n) && !justified.has(n));
    const extraForStaff = staff.filter((n) => !owner.includes(n) && !justified.has(n));

    expect(
      missingForStaff,
      `A super-admin is missing controls the owner has. Gate new controls on the resolved ` +
        `\`canManageReport\` authorization, not on \`variant === "advisor"\`. ` +
        `If the difference is intentional, add it to JUSTIFIED_DIFFERENCES with a reason.`
    ).toEqual([]);
    expect(extraForStaff, "A super-admin has controls the owner does not.").toEqual([]);
  });

  it("keeps the donor share view free of every management control", () => {
    const report = buildReport();
    const owner = affordancesFor("advisor", report, true);

    const shared = renderWithProviders(<ReportBrief isTerminal report={report} variant="shared" />);
    const sharedNames = INTERACTIVE_ROLES.flatMap((role) =>
      shared.queryAllByRole(role).map((el) => `${role}:${el.textContent?.trim() || ""}`)
    );

    // The share view is the opposite invariant: it must NOT gain the owner's
    // write affordances as new ones are added.
    expect(sharedNames).not.toContain("button:Ask questions");
    expect(sharedNames).not.toContain("button:Connect");
    expect(owner.length).toBeGreaterThan(sharedNames.length);
  });
});
