import { describe, expect, it } from "vitest";
import type { CompositeWeights, ResearchReportCandidate } from "@/types/donor-research";
import { computeLiveRanking } from "./use-live-ranked-candidates";

function candidate(
  id: string,
  ein: string | null,
  components: ResearchReportCandidate["components"],
  featuredFlag: boolean
): ResearchReportCandidate {
  return {
    id,
    fundingOrganizationId: `org-${id}`,
    organizationName: `Org ${id}`,
    organizationDescription: null,
    organizationCity: null,
    organizationState: null,
    organizationWebsiteUrl: null,
    ein,
    composite: 0,
    components,
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
    reasoningSummary: null,
    onePagerText: null,
    detailedText: null,
    financials: [],
  };
}

// Persisted top-3 = C1, C4, C2 (the default-weights ordering).
const CANDIDATES: ResearchReportCandidate[] = [
  candidate(
    "c1",
    "100",
    {
      onlinePresence: 0.8,
      socialPresence: 0.5,
      impactRecency: 0.6,
      donorMatch: 0.7,
      compliance: 1.0,
    },
    true
  ),
  candidate(
    "c2",
    "200",
    {
      onlinePresence: 0.4,
      socialPresence: 0.9,
      impactRecency: 0.8,
      donorMatch: 0.5,
      compliance: 0.6,
    },
    true
  ),
  candidate(
    "c3",
    null,
    {
      onlinePresence: 0.9,
      socialPresence: 0.1,
      impactRecency: 0.3,
      donorMatch: 0.9,
      compliance: 0.3,
    },
    false
  ),
  candidate(
    "c4",
    "300",
    {
      onlinePresence: 0.2,
      socialPresence: 0.2,
      impactRecency: 0.9,
      donorMatch: 0.9,
      compliance: 1.0,
    },
    true
  ),
  candidate(
    "c5",
    "050",
    {
      onlinePresence: 0.5,
      socialPresence: 0.5,
      impactRecency: 0.5,
      donorMatch: 0.5,
      compliance: 0.5,
    },
    false
  ),
];

const DEFAULT_WEIGHTS: CompositeWeights = {
  onlinePresence: 2500,
  socialPresence: 1000,
  impactRecency: 2500,
  donorMatch: 2500,
  compliance: 1500,
};

describe("computeLiveRanking", () => {
  it("reports no flips when the previewed top-3 matches the persisted top-3", () => {
    const live = computeLiveRanking(CANDIDATES, DEFAULT_WEIGHTS, 3);
    expect(live.ranked.map((r) => r.candidate.id)).toEqual(["c1", "c4", "c2", "c3", "c5"]);
    expect(live.flippedCount).toBe(0);
    expect([...live.entering]).toEqual([]);
    expect([...live.leaving]).toEqual([]);
  });

  it("flags entering and leaving candidates when the top-3 changes", () => {
    // Online-presence-only weights: order becomes c3, c1, c5, c2, c4.
    const onlineOnly: CompositeWeights = {
      onlinePresence: 10000,
      socialPresence: 0,
      impactRecency: 0,
      donorMatch: 0,
      compliance: 0,
    };
    const live = computeLiveRanking(CANDIDATES, onlineOnly, 3);
    expect(live.ranked.map((r) => r.candidate.id)).toEqual(["c3", "c1", "c5", "c2", "c4"]);
    // New top-3 = c3, c1, c5. Persisted top-3 = c1, c4, c2.
    expect(live.entering).toEqual(new Set(["c3", "c5"]));
    expect(live.leaving).toEqual(new Set(["c2", "c4"]));
    // flippedCount counts entrants (the one-pagers the backend synthesizes).
    expect(live.flippedCount).toBe(2);
  });

  it("moves the featured cutoff with topCount (lowering N drops featured candidates)", () => {
    // topCount=1 under default weights: only the top candidate (c1) stays featured.
    const live = computeLiveRanking(CANDIDATES, DEFAULT_WEIGHTS, 1);
    expect(live.ranked.filter((r) => r.featuredFlag).map((r) => r.candidate.id)).toEqual(["c1"]);
    // c4 + c2 were featured (persisted) and now leave; nothing new enters.
    expect(live.entering).toEqual(new Set());
    expect(live.leaving).toEqual(new Set(["c4", "c2"]));
    expect(live.flippedCount).toBe(0);
  });

  it("raising topCount adds new entrants to the featured set", () => {
    // topCount=4 under default weights (order c1,c4,c2,c3,c5): c3 newly enters.
    const live = computeLiveRanking(CANDIDATES, DEFAULT_WEIGHTS, 4);
    expect(live.entering).toEqual(new Set(["c3"]));
    expect(live.leaving).toEqual(new Set());
    expect(live.flippedCount).toBe(1);
  });
});
