import { describe, expect, it } from "vitest";
import type { CompositeWeights, ResearchReportCandidate } from "@/types/donor-research";
import parityFixture from "../__fixtures__/parity-fixture.json";
import {
  componentRows,
  compositeBand,
  compositeFromComponents,
  DEFAULT_WEIGHTS_BASIS_POINTS,
  methodologyWeightRows,
  onlinePresenceScore,
  recompute,
  weightsToDecimals,
} from "../scoring";

function makeCandidate(
  overrides: Partial<ResearchReportCandidate> & {
    components: ResearchReportCandidate["components"];
  }
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
    composite: 0,
    featuredFlag: false,
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
    reasoningSummary: null,
    onePagerText: null,
    detailedText: null,
    financials: [],
    ...overrides,
  };
}

describe("compositeFromComponents", () => {
  it("is byte-equivalent to the backend weighted sum, rounded to 3 decimals", () => {
    const components = {
      onlinePresence: 0.8,
      socialPresence: 0.5,
      impactRecency: 0.6,
      donorMatch: 0.7,
      compliance: 1.0,
    };
    const composite = compositeFromComponents(
      components,
      weightsToDecimals(DEFAULT_WEIGHTS_BASIS_POINTS)
    );
    // 0.8*.25 + 0.5*.10 + 0.6*.25 + 0.7*.25 + 1.0*.15 = 0.725
    expect(composite).toBe(0.725);
  });

  it("treats a missing online/social/freshness component as 0", () => {
    const composite = compositeFromComponents(
      { impactRecency: 0, donorMatch: 0, compliance: 0 },
      weightsToDecimals(DEFAULT_WEIGHTS_BASIS_POINTS)
    );
    expect(composite).toBe(0);
  });

  it("falls back to legacy `freshness` for the online-presence term", () => {
    const decimals = weightsToDecimals(DEFAULT_WEIGHTS_BASIS_POINTS);
    const fromFreshness = compositeFromComponents(
      { freshness: 0.8, impactRecency: 0, donorMatch: 0, compliance: 0 },
      decimals
    );
    const fromOnline = compositeFromComponents(
      { onlinePresence: 0.8, impactRecency: 0, donorMatch: 0, compliance: 0 },
      decimals
    );
    expect(fromFreshness).toBe(fromOnline);
  });
});

describe("recompute — backend parity", () => {
  const candidates = parityFixture.candidates.map((c) =>
    makeCandidate({
      id: c.id,
      ein: c.ein,
      fundingOrganizationId: c.fundingOrganizationId,
      components: c.components,
    })
  );

  it("matches the default-weights parity vector (order + composites + top-3)", () => {
    const ranked = recompute(candidates, parityFixture.defaultWeights as CompositeWeights);

    expect(ranked.map((r) => r.candidate.id)).toEqual(parityFixture.expectedDefault.order);
    for (const r of ranked) {
      expect(r.composite).toBe(
        (parityFixture.expectedDefault.composites as Record<string, number>)[r.candidate.id]
      );
    }
    expect(ranked.filter((r) => r.featuredFlag).map((r) => r.candidate.id)).toEqual(
      parityFixture.expectedDefault.topThree
    );
  });

  it("re-orders under custom weights and breaks ties by EIN asc (nulls last)", () => {
    const ranked = recompute(candidates, parityFixture.complianceOnlyWeights as CompositeWeights);
    expect(ranked.map((r) => r.candidate.id)).toEqual(parityFixture.expectedComplianceOnly.order);
    expect(ranked.filter((r) => r.featuredFlag).map((r) => r.candidate.id)).toEqual(
      parityFixture.expectedComplianceOnly.topThree
    );
  });

  it("ranks one dimension at 10000 bp purely on that dimension", () => {
    const onlineOnly: CompositeWeights = {
      onlinePresence: 10000,
      socialPresence: 0,
      impactRecency: 0,
      donorMatch: 0,
      compliance: 0,
    };
    const ranked = recompute(candidates, onlineOnly);
    // c3 has the highest onlinePresence (0.9)
    expect(ranked[0].candidate.id).toBe("c3");
  });
});

describe("onlinePresenceScore", () => {
  it("prefers onlinePresence, falls back to freshness, then 0", () => {
    expect(
      onlinePresenceScore(
        makeCandidate({
          components: { onlinePresence: 0.4, impactRecency: 0, donorMatch: 0, compliance: 0 },
        })
      )
    ).toBe(0.4);
    expect(
      onlinePresenceScore(
        makeCandidate({
          components: { freshness: 0.7, impactRecency: 0, donorMatch: 0, compliance: 0 },
        })
      )
    ).toBe(0.7);
    expect(
      onlinePresenceScore(
        makeCandidate({ components: { impactRecency: 0, donorMatch: 0, compliance: 0 } })
      )
    ).toBe(0);
  });
});

describe("componentRows", () => {
  it("renders the legacy four rows from `freshness` when weights are null", () => {
    const rows = componentRows(
      makeCandidate({
        components: { freshness: 0.5, impactRecency: 0.3, donorMatch: 0.8, compliance: 1 },
      }),
      null
    );
    expect(rows.map((r) => [r.label, r.scoreOutOf100, r.contributionOutOf100])).toEqual([
      ["Mission match", 80, 20], // donorMatch 0.8 × 0.25
      ["Online presence", 50, 18], // freshness 0.5 × 0.35 (17.5 → 18)
      ["IRS 990 recency", 30, 8], // impactRecency 0.3 × 0.25 (7.5 → 8)
      ["Compliance", 100, 15], // compliance 1.0 × 0.15
    ]);
  });

  it("renders five rows from the persisted weights when present", () => {
    const rows = componentRows(
      makeCandidate({
        components: {
          onlinePresence: 0.8,
          socialPresence: 0.5,
          impactRecency: 0.6,
          donorMatch: 0.7,
          compliance: 1.0,
        },
      }),
      DEFAULT_WEIGHTS_BASIS_POINTS
    );
    expect(rows.map((r) => r.label)).toEqual([
      "Online presence",
      "Social presence",
      "IRS 990 recency",
      "Mission match",
      "Compliance",
    ]);
    // social presence: 0.5 × 0.10 → 5
    const social = rows.find((r) => r.key === "socialPresence");
    expect(social?.contributionOutOf100).toBe(5);
  });
});

describe("methodologyWeightRows", () => {
  it("returns four legacy rows when weights are null", () => {
    const rows = methodologyWeightRows(null);
    expect(rows.map((r) => [r.label, r.percent])).toEqual([
      ["Online presence", 35],
      ["IRS 990 recency", 25],
      ["Mission match", 25],
      ["Compliance", 15],
    ]);
  });

  it("returns five rows in R16 order from basis points when present", () => {
    const rows = methodologyWeightRows(DEFAULT_WEIGHTS_BASIS_POINTS);
    expect(rows.map((r) => [r.label, r.percent])).toEqual([
      ["Online presence", 25],
      ["Social presence", 10],
      ["IRS 990 recency", 25],
      ["Mission match", 25],
      ["Compliance", 15],
    ]);
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
