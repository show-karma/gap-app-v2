import { describe, expect, it } from "vitest";
import type { ResearchReportCandidate } from "@/types/donor-research";
import { componentRows, compositeBand } from "../scoring";

function makeCandidate(
  components: ResearchReportCandidate["components"],
  composite: number
): ResearchReportCandidate {
  return {
    id: "c1",
    fundingOrganizationId: "org1",
    organizationName: "Example Org",
    organizationDescription: null,
    organizationCity: null,
    organizationState: null,
    organizationWebsiteUrl: null,
    ein: null,
    composite,
    components,
    topThreeFlag: true,
    complianceVerdict: "verified",
    disqualificationReasons: [],
    complianceChecks: [],
    recentMentions: [],
    stateRegistrationStatus: "not_verified",
    activitySignalStatus: "no_signal",
    websiteLastUpdatedAt: null,
    socialLastPostAt: null,
    socialMetrics: null,
    reasoningSummary: null,
    onePagerText: null,
    detailedText: null,
    financials: [],
  };
}

describe("componentRows", () => {
  it("maps the four weighted components to score × weight = contribution", () => {
    const rows = componentRows(
      makeCandidate({ freshness: 0.5, impactRecency: 0.3, donorMatch: 0.8, compliance: 1 }, 0.41)
    );

    expect(rows.map((r) => [r.label, r.scoreOutOf100, r.contributionOutOf100])).toEqual([
      ["Mission match", 80, 20], // donorMatch 0.8 × 0.25
      ["Online presence", 50, 18], // freshness 0.5 × 0.35 (17.5 → 18)
      ["IRS 990 recency", 30, 8], // impactRecency 0.3 × 0.25 (7.5 → 8)
      ["Compliance", 100, 15], // compliance 1.0 × 0.15
    ]);
  });

  it("contributions sum to (approximately) the composite × 100", () => {
    const rows = componentRows(
      makeCandidate({ freshness: 0.5, impactRecency: 0.3, donorMatch: 0.8, compliance: 1 }, 0.41)
    );
    const total = rows.reduce((sum, r) => sum + r.contributionOutOf100, 0);
    expect(total).toBe(61); // 20 + 18 + 8 + 15
  });
});

describe("compositeBand", () => {
  it.each<[number, boolean, string]>([
    [0.92, false, "Outstanding fit"],
    [0.6, false, "Outstanding fit"],
    [0.5, false, "Strong fit"],
    [0.4, false, "Strong fit"],
    [0.3, false, "Promising"],
    [0.25, false, "Promising"],
    [0.1, false, "Marginal"],
  ])("maps composite %s to %s", (score, disqualified, expected) => {
    expect(compositeBand(score, disqualified)).toBe(expected);
  });

  it("returns Disqualified regardless of score when disqualified", () => {
    expect(compositeBand(0.95, true)).toBe("Disqualified");
  });
});
