import type { Grant, GrantMilestone } from "@/types/v2/grant";
import type { Project } from "@/types/v2/project";
import { applyOverrides, type DeepPartial, randomAddress, seq } from "./utils";

// ─── Project factory ───

export function createMockProject(overrides?: DeepPartial<Project>): Project {
  const n = seq();
  const owner = randomAddress();
  const defaults: Project = {
    uid: `0x${n.toString(16).padStart(16, "0")}` as `0x${string}`,
    chainID: 10,
    owner,
    details: {
      title: `Karma Protocol v${n}`,
      description:
        "A decentralized reputation and grant tracking protocol enabling transparent milestone verification on-chain.",
      slug: `karma-protocol-v${n}`,
      problem: "Grant recipients lack accountability tools for milestone tracking",
      solution: "On-chain attestations tied to milestones and deliverables",
      missionSummary: "Transparent grant accountability for the Ethereum ecosystem",
      locationOfImpact: "Global",
      logoUrl: `https://storage.karma.fund/projects/logo-${n}.png`,
      businessModel: "Public Goods",
      stageIn: "Growth",
      raisedMoney: "$250K",
      pathToTake: "Ecosystem Partnerships",
      tags: ["grants", "accountability", "attestations"],
      links: [
        { type: "website", url: `https://karma-v${n}.fund` },
        { type: "twitter", url: `https://twitter.com/karma_v${n}` },
        { type: "github", url: `https://github.com/karma-protocol/v${n}` },
      ],
    },
    members: [
      {
        address: owner,
        role: "Owner",
        joinedAt: "2024-03-01T12:00:00Z",
      },
    ],
    endorsements: [],
    communities: [],
    symlinks: [],
    pointers: [],
    external: {
      gitcoin: [],
      oso: [],
      divvi_wallets: [],
      github: [],
      network_addresses: [],
    },
  };
  return applyOverrides(defaults, overrides);
}

// ─── Grant factory ───

export function createMockGrant(overrides?: DeepPartial<Grant>): Grant {
  const n = seq();
  const recipient = randomAddress();
  const defaults: Grant = {
    uid: `0xgrant${n.toString(16).padStart(12, "0")}` as `0x${string}`,
    chainID: 10,
    recipient,
    details: {
      title: `Infrastructure Scaling Grant #${n}`,
      amount: "50000",
      currency: "USDC",
      description: "Scaling infrastructure for indexing and attestation services",
      proposalURL: `https://forum.karma.fund/proposals/${n}`,
      payoutAddress: recipient,
      programId: `program-${n}`,
    },
    milestones: [],
    updates: [],
    community: {
      uid: `0xcommunity${n.toString(16).padStart(8, "0")}` as `0x${string}`,
      chainID: 10,
      details: {
        name: "Optimism Grants Council",
        slug: "optimism-grants",
        imageURL: "https://storage.karma.fund/communities/optimism.png",
      },
    },
    categories: ["infrastructure"],
    createdAt: "2024-06-15T09:00:00Z",
    updatedAt: "2024-06-15T09:00:00Z",
  };
  return applyOverrides(defaults, overrides);
}

// ─── Grant Milestone factory ───

export function createMockGrantMilestone(overrides?: DeepPartial<GrantMilestone>): GrantMilestone {
  const n = seq();
  const defaults: GrantMilestone = {
    uid: `0xmilestone${n.toString(16).padStart(8, "0")}`,
    chainID: 10,
    title: `Milestone ${n}: API endpoint deployment`,
    description: "Deploy and verify the v2 REST API endpoints on production infrastructure",
    priority: n,
    endsAt: Math.floor(Date.now() / 1000) + 90 * 86400,
    verified: [],
    createdAt: "2024-06-20T10:00:00Z",
  };
  return applyOverrides(defaults, overrides);
}
