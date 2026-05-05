import type { Grant } from "@/types/v2/grant";
import { createMockGrant } from "./project.factory";
import type { DeepPartial } from "./utils";
import { seq } from "./utils";

// Re-export base factory for convenience
export { createMockGrant } from "./project.factory";

// ─── Status presets ───

export function activeGrant(overrides?: DeepPartial<Grant>): Grant {
  return createMockGrant({
    details: {
      title: `Active Builder Grant #${seq()}`,
      amount: "25000",
      currency: "USDC",
    },
    milestones: [],
    ...overrides,
  } as DeepPartial<Grant>);
}

export function completedGrant(overrides?: DeepPartial<Grant>): Grant {
  return createMockGrant({
    details: {
      title: `Completed Grant #${seq()}`,
      amount: "50000",
      currency: "USDC",
    },
    categories: ["infrastructure", "completed"],
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-09-01T12:00:00Z",
    ...overrides,
  } as DeepPartial<Grant>);
}

export function grantWithMilestones(overrides?: DeepPartial<Grant>): Grant {
  const n = seq();
  return createMockGrant({
    details: {
      title: `Milestone-tracked Grant #${n}`,
      amount: "75000",
      currency: "USDC",
    },
    milestones: [
      {
        uid: `0xms${n}a`,
        chainID: 10,
        title: "Research & Design",
        description: "Complete technical design document and architecture review",
        priority: 1,
        endsAt: Math.floor(Date.now() / 1000) + 30 * 86400,
        verified: [],
        createdAt: "2024-06-01T10:00:00Z",
      },
      {
        uid: `0xms${n}b`,
        chainID: 10,
        title: "Implementation",
        description: "Build and deploy core functionality",
        priority: 2,
        endsAt: Math.floor(Date.now() / 1000) + 60 * 86400,
        verified: [],
        createdAt: "2024-06-01T10:00:00Z",
      },
    ],
    ...overrides,
  } as DeepPartial<Grant>);
}

// ─── List factory ───

export function createGrantList(count: number): Grant[] {
  return Array.from({ length: count }, () => createMockGrant());
}
