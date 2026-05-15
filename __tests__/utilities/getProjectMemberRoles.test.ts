import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProjectMemberRoles } from "@/utilities/getProjectMemberRoles";

const OWNER = "0xb4713f39476841faf0ea5a555d0b1d451e6b05a1";
const ADMIN_A = "0x741e2cdff080bd42cd30cfd6cc4a8a0f46a80a84";
const ADMIN_B = "0x857d42edc040c49bd2eace9479fe3d611f94ba63";
const PLAIN_MEMBER = "0x1111111111111111111111111111111111111111";

// vi.mock is hoisted above imports; use vi.hoisted for any state that mocks
// reference at module init.
const mockState = vi.hoisted(() => ({
  projectAdminsByAddr: {} as Record<string, boolean>,
  projectOwnerReturn: "" as string,
}));

vi.mock("ethers", () => {
  class MockContract {
    projectOwner = async () => mockState.projectOwnerReturn;
    projectAdmins = async (_uid: string, addr: string) =>
      mockState.projectAdminsByAddr[addr.toLowerCase()] ?? false;
  }
  class MockProvider {}
  return {
    ethers: {
      JsonRpcProvider: MockProvider,
      Contract: MockContract,
    },
  };
});

vi.mock("@show-karma/karma-gap-sdk/core/consts", () => ({
  chainIdToNetwork: { 8453: "base" } as Record<number, string>,
  Networks: {
    base: { contracts: { projectResolver: "0xd2eD366393FDfd243931Fe48e9fb65A192B0018c" } },
  },
}));

vi.mock("@/utilities/rpcClient", () => ({
  getRPCUrlByChainId: vi.fn(() => "https://base.example/rpc"),
}));

const buildProject = (overrides?: Partial<{ owner: string; members: string[] }>) =>
  ({
    uid: "0x16bc3ee698d158aec7d1931c0254d4f7736aa300ddf64615348f9e4b30e4bb2a",
    chainID: 8453,
    owner: overrides?.owner,
    members: (overrides?.members ?? [OWNER, ADMIN_A, ADMIN_B]).map((address) => ({
      uid: `member-${address}`,
      address,
    })),
  }) as any;

describe("getProjectMemberRoles", () => {
  beforeEach(() => {
    mockState.projectOwnerReturn = OWNER;
    for (const key of Object.keys(mockState.projectAdminsByAddr))
      delete mockState.projectAdminsByAddr[key];
  });

  it("labels the on-chain projectOwner mapping as Owner (regardless of admin flag)", async () => {
    mockState.projectOwnerReturn = OWNER;
    mockState.projectAdminsByAddr[OWNER] = false;

    const roles = await getProjectMemberRoles(buildProject());

    expect(roles[OWNER]).toBe("Owner");
  });

  it("labels members in projectAdmins[uid][addr] as Admin, never as Owner", async () => {
    mockState.projectOwnerReturn = OWNER;
    mockState.projectAdminsByAddr[ADMIN_A] = true;
    mockState.projectAdminsByAddr[ADMIN_B] = true;

    const roles = await getProjectMemberRoles(buildProject());

    expect(roles[ADMIN_A]).toBe("Admin");
    expect(roles[ADMIN_B]).toBe("Admin");
    expect(Object.values(roles).filter((r) => r === "Owner")).toHaveLength(1);
  });

  it("labels members without admin status as Member", async () => {
    mockState.projectOwnerReturn = OWNER;

    const roles = await getProjectMemberRoles(
      buildProject({ members: [OWNER, PLAIN_MEMBER] })
    );

    expect(roles[PLAIN_MEMBER]).toBe("Member");
  });

  it("falls back to project.owner (indexer field) when the on-chain projectOwner mapping is the zero address", async () => {
    mockState.projectOwnerReturn = "0x0000000000000000000000000000000000000000";

    const roles = await getProjectMemberRoles(
      buildProject({ owner: OWNER, members: [OWNER, ADMIN_A] })
    );

    expect(roles[OWNER]).toBe("Owner");
  });

  it("labels the indexer Owner even when no RPC URL is configured (no admin info)", async () => {
    const rpcMod = await import("@/utilities/rpcClient");
    vi.mocked(rpcMod.getRPCUrlByChainId).mockReturnValueOnce(undefined);

    const roles = await getProjectMemberRoles(
      buildProject({ owner: OWNER, members: [OWNER, ADMIN_A] })
    );

    expect(roles[OWNER]).toBe("Owner");
    expect(roles[ADMIN_A]).toBeUndefined();
  });

  it("does not produce a second Owner label when the resolver claims an admin is also the owner", async () => {
    // Mirrors the Forest bug: the SDK's isOwner returns true for all admins,
    // but only one address — the projectOwner mapping — should render as Owner.
    mockState.projectOwnerReturn = OWNER;
    mockState.projectAdminsByAddr[OWNER] = false;
    mockState.projectAdminsByAddr[ADMIN_A] = true;
    mockState.projectAdminsByAddr[ADMIN_B] = true;

    const roles = await getProjectMemberRoles(buildProject());

    const ownerLabels = Object.entries(roles).filter(([, role]) => role === "Owner");
    expect(ownerLabels).toHaveLength(1);
    expect(ownerLabels[0][0]).toBe(OWNER);
  });
});
