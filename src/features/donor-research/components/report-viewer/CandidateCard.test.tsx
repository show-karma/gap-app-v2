import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ResearchReportCandidate } from "@/types/donor-research";

// FinancialsTable (rendered by CandidateCard) pulls in the brief fonts, which
// load next/font/google — unavailable in the unit runtime. Stub it.
vi.mock("../report-brief/fonts", () => ({
  briefDisplay: { className: "brief-display" },
  briefProse: { className: "brief-prose" },
}));

import { CandidateCard } from "./CandidateCard";

function buildCandidate(overrides: Partial<ResearchReportCandidate> = {}): ResearchReportCandidate {
  return {
    id: "candidate-1",
    fundingOrganizationId: "org-1",
    organizationName: "Example Nonprofit",
    organizationDescription: "Runs community programs.",
    organizationCity: "Seattle",
    organizationState: "WA",
    organizationWebsiteUrl: "https://example.org",
    ein: "123456789",
    composite: 0.77,
    components: {
      freshness: 0.77,
      impactRecency: 0.3,
      donorMatch: 0.8,
      compliance: 1,
    },
    topThreeFlag: true,
    complianceVerdict: "verified",
    disqualificationReasons: [],
    complianceChecks: [
      {
        name: "pub78",
        label: "IRS Pub 78 active",
        status: "passed",
        detail: "Listed as an active 501(c)(3) in IRS Publication 78.",
      },
      {
        name: "recent_990",
        label: "Recent 990 on file",
        status: "failed",
        detail: "Most recent 990 filed 2021 — older than the 3-year freshness window.",
      },
      {
        name: "ca_ag",
        label: "CA Attorney General registry",
        status: "not_applicable",
        detail: "California AG registry only applies to organizations registered in California.",
      },
      {
        name: "governance",
        label: "Governance signals",
        status: "unknown",
        detail: "No 990 filing data indexed, so governance signals could not be verified.",
      },
    ],
    recentMentions: [],
    stateRegistrationStatus: "not_verified",
    activitySignalStatus: "no_signal",
    websiteLastUpdatedAt: null,
    socialLastPostAt: null,
    reasoningSummary: null,
    onePagerText: null,
    detailedText: null,
    financials: [],
    ...overrides,
  };
}

describe("CandidateCard score evidence", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the last-3-year financials table on the also-considered surface", () => {
    render(
      <CandidateCard
        candidate={buildCandidate({
          financials: [{ year: 2024, income: 1200000, expenses: 800000, assets: 5000000 }],
        })}
        variant="detail"
      />
    );

    expect(screen.getByRole("columnheader", { name: "Income" })).toBeInTheDocument();
    expect(screen.getByText("$1.2M")).toBeInTheDocument();
  });

  it("shows the latest IRS 990 age instead of a vague still-operating phrase", () => {
    render(<CandidateCard candidate={buildCandidate()} variant="detail" />);

    expect(screen.getByText("IRS 990 recency")).toBeInTheDocument();
    expect(
      screen.getAllByText("Most recent 990 filed 2021 — older than the 3-year freshness window.")
        .length
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/may still be running/)).not.toBeInTheDocument();
  });

  it("does not claim full state-registry verification when state data was not checked", () => {
    render(
      <CandidateCard
        candidate={buildCandidate({
          complianceChecks: [
            {
              name: "pub78",
              label: "IRS Pub 78 active",
              status: "passed",
              detail: "Listed as an active 501(c)(3) in IRS Publication 78.",
            },
            {
              name: "recent_990",
              label: "Recent 990 on file",
              status: "passed",
              detail: "Most recent 990 filed 2025 (about a year ago).",
            },
            {
              name: "ca_ag",
              label: "CA Attorney General registry",
              status: "not_applicable",
              detail:
                "California AG registry only applies to organizations registered in California.",
            },
            {
              name: "governance",
              label: "Governance signals",
              status: "passed",
              detail: "No governance red flags surfaced on the most recent indexed 990 (2025).",
            },
          ],
        })}
        variant="detail"
      />
    );

    expect(screen.queryByText(/Fully verified across IRS and state registries/)).toBeNull();
    expect(screen.getByText(/State registry was not checked for this state/)).toBeInTheDocument();
  });

  it("explains online-presence score differences with saved proof links", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-06T12:00:00Z"));

    render(
      <CandidateCard
        candidate={buildCandidate({
          recentMentions: [
            {
              kind: "own_domain",
              url: "https://example.org/news/program-update",
              title: "Program update",
              publisher: "example.org",
              publishedDate: "2026-05-20T00:00:00Z",
              matchScore: 0.91,
              matchSignals: ["name", "location"],
            },
            {
              kind: "external_mention",
              url: "https://news.example.com/example-nonprofit",
              title: "Coverage",
              publisher: "Local News",
              publishedDate: "2026-05-01T00:00:00Z",
              matchScore: 0.82,
              matchSignals: ["ein"],
            },
          ],
        })}
        variant="detail"
      />
    );

    expect(
      screen.getByText(
        "Latest public activity was about 17 days ago. Found 2 validated mentions; proof links are listed below."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Program update")).toBeInTheDocument();
    expect(screen.getByText("Coverage")).toBeInTheDocument();
  });
});
