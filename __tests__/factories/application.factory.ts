import type { FundingApplicationStatusV2, IFundingApplication } from "@/types/funding-platform";
import { applyOverrides, type DeepPartial, randomAddress, seq } from "./utils";

// ─── Application factory ───

export function createMockApplication(
  overrides?: DeepPartial<IFundingApplication>
): IFundingApplication {
  const n = seq();
  const refNum = `APP-${String(n).padStart(5, "0")}-${String(10000 + n).padStart(5, "0")}`;
  const now = new Date().toISOString();
  const defaults: IFundingApplication = {
    id: `app-${n}`,
    programId: `program-${n}`,
    chainID: 10,
    applicantEmail: `applicant-${n}@karma.fund`,
    ownerAddress: randomAddress(),
    applicationData: {
      projectName: `Grant Application Project ${n}`,
      teamSize: "5-10",
      fundingRequested: "25000",
      projectDescription:
        "Building open-source tooling for on-chain grant accountability and milestone tracking.",
      previousWork: "Contributed to EAS, Optimism Attestation Station, and Gitcoin Passport.",
    },
    status: "pending" as FundingApplicationStatusV2,
    statusHistory: [
      {
        status: "pending" as FundingApplicationStatusV2,
        timestamp: now,
      },
    ],
    referenceNumber: refNum,
    submissionIP: "192.168.1.1",
    createdAt: now,
    updatedAt: now,
  };
  return applyOverrides(defaults, overrides);
}

// ─── Status presets ───

export function draftApplication(
  overrides?: DeepPartial<IFundingApplication>
): IFundingApplication {
  return createMockApplication({
    status: "pending" as FundingApplicationStatusV2,
    ...overrides,
  } as DeepPartial<IFundingApplication>);
}

export function submittedApplication(
  overrides?: DeepPartial<IFundingApplication>
): IFundingApplication {
  const submittedAt = "2024-07-01T10:00:00Z";
  const reviewAt = "2024-07-03T14:30:00Z";
  return createMockApplication({
    status: "under_review" as FundingApplicationStatusV2,
    statusHistory: [
      { status: "pending" as FundingApplicationStatusV2, timestamp: submittedAt },
      { status: "under_review" as FundingApplicationStatusV2, timestamp: reviewAt },
    ],
    createdAt: submittedAt,
    updatedAt: reviewAt,
    ...overrides,
  } as DeepPartial<IFundingApplication>);
}

export function approvedApplication(
  overrides?: DeepPartial<IFundingApplication>
): IFundingApplication {
  const submittedAt = "2024-07-01T10:00:00Z";
  const approvedAt = "2024-07-10T16:00:00Z";
  return createMockApplication({
    status: "approved" as FundingApplicationStatusV2,
    statusHistory: [
      { status: "pending" as FundingApplicationStatusV2, timestamp: submittedAt },
      {
        status: "under_review" as FundingApplicationStatusV2,
        timestamp: "2024-07-03T14:30:00Z",
      },
      { status: "approved" as FundingApplicationStatusV2, timestamp: approvedAt },
    ],
    projectUID: `0xapproved-project-${seq()}`,
    createdAt: submittedAt,
    updatedAt: approvedAt,
    ...overrides,
  } as DeepPartial<IFundingApplication>);
}

export function rejectedApplication(
  overrides?: DeepPartial<IFundingApplication>
): IFundingApplication {
  const submittedAt = "2024-07-01T10:00:00Z";
  const rejectedAt = "2024-07-08T11:00:00Z";
  return createMockApplication({
    status: "rejected" as FundingApplicationStatusV2,
    statusHistory: [
      { status: "pending" as FundingApplicationStatusV2, timestamp: submittedAt },
      {
        status: "under_review" as FundingApplicationStatusV2,
        timestamp: "2024-07-03T14:30:00Z",
      },
      {
        status: "rejected" as FundingApplicationStatusV2,
        timestamp: rejectedAt,
        reason: "Proposal scope exceeds program budget",
      },
    ],
    createdAt: submittedAt,
    updatedAt: rejectedAt,
    ...overrides,
  } as DeepPartial<IFundingApplication>);
}

// ─── List factory ───

export function createApplicationList(count: number): IFundingApplication[] {
  return Array.from({ length: count }, () => createMockApplication());
}
