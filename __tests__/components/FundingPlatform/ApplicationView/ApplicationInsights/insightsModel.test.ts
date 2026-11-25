import {
  buildActivity,
  buildCommitments,
  getMilestoneState,
  paymentDelayDays,
  simFundsUpTo,
  summarizeTrackRecord,
  unallocatedAmount,
} from "@/components/FundingPlatform/ApplicationView/ApplicationInsights/insightsModel";
import type {
  ProjectIndicator,
  TrackRecordGrant,
  TrackRecordMilestone,
} from "@/services/applicationInsights.service";

const NOW = new Date("2026-11-24T00:00:00Z");

function milestone(overrides: Partial<TrackRecordMilestone> = {}): TrackRecordMilestone {
  return {
    uid: "m",
    title: "Milestone",
    dueDate: "2026-12-31T00:00:00.000Z",
    currentStatus: "pending",
    completedAt: null,
    completionPercentage: null,
    allocatedAmount: null,
    evaluation: null,
    paidAmount: null,
    paidAt: null,
    ...overrides,
  };
}

function grant(overrides: Partial<TrackRecordGrant> = {}): TrackRecordGrant {
  return {
    uid: "g",
    title: "Grant",
    programId: null,
    isCompleted: false,
    completedAt: null,
    createdAt: null,
    totalGrantAmount: null,
    tokenSymbol: null,
    tokenAddress: null,
    chainID: null,
    paidAmount: null,
    paidTokenSymbol: null,
    paymentCount: 0,
    milestones: [],
    ...overrides,
  };
}

describe("getMilestoneState", () => {
  it("counts days after the due date for a late delivery", () => {
    const state = getMilestoneState(
      milestone({
        dueDate: "2026-06-30T00:00:00.000Z",
        currentStatus: "verified",
        completedAt: "2026-07-02T00:00:00.000Z",
      }),
      NOW
    );

    expect(state).toEqual({ kind: "delivered", dayOffset: 2 });
  });

  it("marks an open milestone past its due date as past due", () => {
    const state = getMilestoneState(milestone({ dueDate: "2026-11-01T00:00:00.000Z" }), NOW);

    expect(state).toEqual({ kind: "past_due", dayOffset: -23 });
  });

  it.each([
    ["2026-12-31T00:00:00.000Z", "in_progress", 37],
    ["2027-03-31T00:00:00.000Z", "upcoming", 127],
  ])("classifies an open milestone due %s as %s", (dueDate, kind, dayOffset) => {
    expect(getMilestoneState(milestone({ dueDate }), NOW)).toEqual({ kind, dayOffset });
  });
});

describe("summarizeTrackRecord", () => {
  const forest = [
    grant({
      uid: "batch-3",
      title: "Filecoin ProPGF Batch 3",
      totalGrantAmount: "504000",
      milestones: [
        milestone({ uid: "a" }),
        milestone({ uid: "b", dueDate: "2027-03-31T00:00:00.000Z" }),
      ],
    }),
    grant({
      uid: "batch-2",
      title: "Filecoin ProPGF Batch 2",
      totalGrantAmount: "504000",
      tokenSymbol: "USDC",
      paidAmount: "420840",
      paidTokenSymbol: "USDC",
      paymentCount: 2,
      milestones: [
        milestone({
          uid: "c",
          dueDate: "2026-06-30T00:00:00.000Z",
          currentStatus: "verified",
          completedAt: "2026-07-02T00:00:00.000Z",
        }),
        milestone({
          uid: "d",
          dueDate: "2026-09-30T00:00:00.000Z",
          currentStatus: "verified",
          completedAt: "2026-09-28T00:00:00.000Z",
        }),
      ],
    }),
  ];

  it("counts a grant without a token as USDC, the default payout token", () => {
    expect(summarizeTrackRecord(forest, NOW).fundingByToken).toEqual([
      { token: "USDC", approved: 1_008_000, paid: 420_840, grantCount: 2 },
    ]);
  });

  it("keeps different tokens in separate groups", () => {
    const mixed = [...forest, grant({ uid: "op", totalGrantAmount: "1000", tokenSymbol: "OP" })];

    expect(summarizeTrackRecord(mixed, NOW).fundingByToken.map((group) => group.token)).toEqual([
      "USDC",
      "OP",
    ]);
  });

  it("counts delivered, late and past-due milestones", () => {
    expect(summarizeTrackRecord(forest, NOW)).toMatchObject({
      milestoneCount: 4,
      deliveredCount: 2,
      deliveredLateCount: 1,
      pastDueCount: 0,
    });
  });

  it("reports no funding group when no grant has an amount", () => {
    const summary = summarizeTrackRecord([grant({ title: "Old grant" })], NOW);

    expect(summary.fundingByToken).toEqual([]);
    expect(summary.grantsWithoutAmount).toEqual(["Old grant"]);
  });
});

function indicator(overrides: Partial<ProjectIndicator> = {}): ProjectIndicator {
  return {
    id: "i",
    name: "Commits",
    unitOfMeasure: "count",
    datapoints: [
      { value: "5", startDate: "2026-11-01T00:00:00.000Z" },
      { value: "7", startDate: "2026-11-02T00:00:00.000Z" },
    ],
    ...overrides,
  } as ProjectIndicator;
}

const cadence = indicator({
  id: "cadence",
  name: "forest-release-cadence",
  description: "Release cadence — average days between releases",
  unitOfMeasure: "days",
  datapoints: [
    {
      value: "16",
      startDate: "2026-11-20T00:00:00.000Z",
      breakdown: JSON.stringify({
        commitmentType: "health",
        slaStatement: "Ships a release every 45 days",
      }),
      thresholdOp: "<=",
      thresholdValue: 45,
    },
    {
      value: "15.04",
      startDate: "2026-11-23T00:00:00.000Z",
      breakdown: JSON.stringify({
        commitmentType: "health",
        slaStatement: "Ships a release every 45 days",
      }),
      thresholdOp: "<=",
      thresholdValue: 45,
    },
  ],
});

describe("buildCommitments", () => {
  it("reads the target from the latest datapoint and marks it met", () => {
    const [commitment] = buildCommitments([cadence, indicator()], NOW);

    expect(commitment).toMatchObject({
      name: "Release cadence",
      statement: "Ships a release every 45 days",
      latestValue: 15.04,
      operator: "<=",
      target: 45,
      met: true,
    });
  });

  it("leaves met null when the commitment has no threshold", () => {
    const noTarget = indicator({
      id: "snapshot",
      datapoints: [
        {
          value: "1621",
          startDate: "2026-11-05T00:00:00.000Z",
          breakdown: JSON.stringify({ commitmentType: "health" }),
        },
      ],
    });

    expect(buildCommitments([noTarget], NOW)[0].met).toBeNull();
  });
});

describe("buildActivity", () => {
  it("excludes commitment indicators and indicators without data", () => {
    const activity = buildActivity(
      [cadence, indicator({ id: "commits" }), indicator({ id: "empty", datapoints: [] })],
      NOW
    );

    expect(activity.map((series) => series.id)).toEqual(["commits"]);
  });
});

describe("simFundsUpTo", () => {
  it("returns the amount where marginal value reaches zero", () => {
    expect(
      simFundsUpTo([
        { dollars: 30000, marginalValueMilli: 300 },
        { dollars: 0, marginalValueMilli: 850 },
        { dollars: 48000, marginalValueMilli: 0 },
      ])
    ).toBe(48000);
  });

  it("returns null without a curve", () => {
    expect(simFundsUpTo([])).toBeNull();
  });
});

describe("payment helpers", () => {
  it("counts the days between verification and payment", () => {
    expect(
      paymentDelayDays(
        milestone({ completedAt: "2026-07-02T15:00:00.000Z", paidAt: "2026-08-26T00:00:00.000Z" })
      )
    ).toBe(55);
  });

  it("returns the part of the grant not allocated to any milestone", () => {
    expect(
      unallocatedAmount(
        grant({
          totalGrantAmount: "504000",
          milestones: [
            milestone({ allocatedAmount: "168840" }),
            milestone({ allocatedAmount: "252000" }),
          ],
        })
      )
    ).toBe(83_160);
  });

  it("returns null when no milestone carries an allocation", () => {
    expect(
      unallocatedAmount(grant({ totalGrantAmount: "504000", milestones: [milestone()] }))
    ).toBeNull();
  });
});
