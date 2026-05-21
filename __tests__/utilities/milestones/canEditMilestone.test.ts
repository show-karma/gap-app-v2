import { describe, expect, it } from "vitest";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { canEditMilestone } from "@/utilities/milestones/canEditMilestone";

const OWNER = "0xb4713F39476841fAF0EA5A555D0B1d451E6B05A1";
const ATTESTER = "0x23B7A53ECFD93803C63B97316D7362EAE59C55B6";
const RANDO = "0x857d42edc040c49bd2eace9479fe3d611f94ba63";

const grantMilestone = (overrides?: { recipient?: string; attester?: string }): UnifiedMilestone =>
  ({
    uid: "0xac1805",
    type: "grant",
    title: "Test",
    completed: false,
    createdAt: "2026-05-01T00:00:00Z",
    chainID: 8453,
    refUID: "0x0",
    source: {
      type: "grant",
      grantMilestone: {
        milestone: {
          uid: "0xac1805",
          chainID: 8453,
          title: "Test",
          verified: [],
          recipient: overrides?.recipient ?? OWNER,
          attester: overrides?.attester ?? ATTESTER,
        },
        grant: { uid: "0xgrant", chainID: 8453 },
      },
    },
  }) as unknown as UnifiedMilestone;

const projectMilestone = (overrides?: {
  recipient?: string;
  attester?: string;
}): UnifiedMilestone =>
  ({
    uid: "0xproj",
    type: "milestone",
    title: "Test",
    completed: false,
    createdAt: "2026-05-01T00:00:00Z",
    chainID: 8453,
    refUID: "0x0",
    source: {
      type: "milestone",
      projectMilestone: {
        uid: "0xproj",
        recipient: overrides?.recipient ?? OWNER,
        attester: overrides?.attester ?? ATTESTER,
      },
    },
  }) as unknown as UnifiedMilestone;

describe("canEditMilestone", () => {
  it("returns true when isContractOwner is true, regardless of other inputs", () => {
    expect(canEditMilestone(null, null, true)).toBe(true);
    expect(canEditMilestone(grantMilestone(), RANDO, true)).toBe(true);
  });

  it("returns true when connected address matches the milestone recipient (grant)", () => {
    expect(canEditMilestone(grantMilestone(), OWNER, false)).toBe(true);
  });

  it("returns true when connected address matches the milestone attester (grant)", () => {
    expect(canEditMilestone(grantMilestone(), ATTESTER, false)).toBe(true);
  });

  it("returns true when connected address matches the milestone recipient (project)", () => {
    expect(canEditMilestone(projectMilestone(), OWNER, false)).toBe(true);
  });

  it("returns false when address matches neither attester nor recipient", () => {
    expect(canEditMilestone(grantMilestone(), RANDO, false)).toBe(false);
  });

  it("returns false when milestone is missing", () => {
    expect(canEditMilestone(null, OWNER, false)).toBe(false);
    expect(canEditMilestone(undefined, OWNER, false)).toBe(false);
  });

  it("returns false when address is missing and user is not the contract owner", () => {
    expect(canEditMilestone(grantMilestone(), null, false)).toBe(false);
    expect(canEditMilestone(grantMilestone(), undefined, false)).toBe(false);
  });

  it("matches addresses case-insensitively (mixed-case inputs are normalised)", () => {
    expect(canEditMilestone(grantMilestone(), OWNER.toLowerCase(), false)).toBe(true);
    expect(canEditMilestone(grantMilestone({ recipient: OWNER.toUpperCase() }), OWNER, false)).toBe(
      true
    );
  });

  it("ignores missing recipient/attester fields without throwing", () => {
    const sparse = {
      uid: "0xac1805",
      type: "grant",
      title: "Test",
      completed: false,
      createdAt: "2026-05-01T00:00:00Z",
      chainID: 8453,
      refUID: "0x0",
      source: { type: "grant", grantMilestone: { milestone: { uid: "0xac1805" } } },
    } as unknown as UnifiedMilestone;
    expect(canEditMilestone(sparse, OWNER, false)).toBe(false);
  });
});
