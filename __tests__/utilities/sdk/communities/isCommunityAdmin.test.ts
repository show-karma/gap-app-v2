import { GAP } from "@show-karma/karma-gap-sdk";
import type { Community } from "@/types/v2/community";
import { getGapRpcConfig } from "@/utilities/gapRpcConfig";
import {
  isCommunityAdminOf,
  isCommunityAdminOfAny,
} from "@/utilities/sdk/communities/isCommunityAdmin";

vi.mock("@show-karma/karma-gap-sdk", () => ({
  GAP: {
    getCommunityResolver: vi.fn(),
  },
}));

vi.mock("@/utilities/gapRpcConfig", () => ({
  getGapRpcConfig: vi.fn(() => ({ 10: "https://rpc.optimism" })),
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

const mockGetCommunityResolver = vi.mocked(GAP.getCommunityResolver);

const community = {
  uid: "0xcb67cd16cbdf4e9c3b6ed4c8f9424411a48be796d690750afc84f9288e7c7996",
  chainID: 10,
} as unknown as Community;

const address = "0x6166E1964447E0959bC7c8d543DB3ab82dB65044";

describe("isCommunityAdminOf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes community.chainID to GAP.getCommunityResolver so the SDK uses a static RPC provider for the community's chain (prevents ethers v6 NETWORK_ERROR on wallet/community chain mismatch)", async () => {
    mockGetCommunityResolver.mockResolvedValue({
      isAdmin: vi.fn().mockResolvedValue(true),
    });

    const signer = { fake: "signer" } as any;

    await isCommunityAdminOf(community, address, signer);

    expect(mockGetCommunityResolver).toHaveBeenCalledWith(
      signer,
      getGapRpcConfig(),
      community.chainID
    );
  });

  it("returns the resolver.isAdmin result", async () => {
    const isAdmin = vi.fn().mockResolvedValue(true);
    mockGetCommunityResolver.mockResolvedValue({ isAdmin });

    const result = await isCommunityAdminOf(community, address);

    expect(result).toBe(true);
    expect(isAdmin).toHaveBeenCalledWith(community.uid, address);
  });

  it("returns false when resolver throws (e.g. NETWORK_ERROR)", async () => {
    mockGetCommunityResolver.mockRejectedValue(
      new Error('network changed: 1 => 10  (event="changed", code=NETWORK_ERROR, version=6.11.0)')
    );

    const result = await isCommunityAdminOf(community, address);

    expect(result).toBe(false);
  });
});

describe("isCommunityAdminOfAny", () => {
  const adminWallet = "0xAdminWallet000000000000000000000000000001";
  const otherWallet = "0xOtherWallet00000000000000000000000000002";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when any wallet is an admin and fetches the resolver only once", async () => {
    const isAdmin = vi.fn(async (_uid: string, addr: string) => addr === adminWallet);
    mockGetCommunityResolver.mockResolvedValue({ isAdmin });

    const result = await isCommunityAdminOfAny(community, [otherWallet, adminWallet]);

    expect(result).toBe(true);
    expect(mockGetCommunityResolver).toHaveBeenCalledTimes(1);
    expect(isAdmin).toHaveBeenCalledWith(community.uid, otherWallet);
    expect(isAdmin).toHaveBeenCalledWith(community.uid, adminWallet);
  });

  it("returns false when no wallet is an admin", async () => {
    const isAdmin = vi.fn().mockResolvedValue(false);
    mockGetCommunityResolver.mockResolvedValue({ isAdmin });

    const result = await isCommunityAdminOfAny(community, [otherWallet, adminWallet]);

    expect(result).toBe(false);
  });

  it("returns false for an empty address list without calling the resolver", async () => {
    const result = await isCommunityAdminOfAny(community, []);

    expect(result).toBe(false);
    expect(mockGetCommunityResolver).not.toHaveBeenCalled();
  });

  it("dedupes addresses case-insensitively", async () => {
    const isAdmin = vi.fn().mockResolvedValue(false);
    mockGetCommunityResolver.mockResolvedValue({ isAdmin });

    await isCommunityAdminOfAny(community, [adminWallet, adminWallet.toLowerCase()]);

    expect(isAdmin).toHaveBeenCalledTimes(1);
  });

  it("tolerates a per-wallet check failure and still resolves the others", async () => {
    const isAdmin = vi.fn(async (_uid: string, addr: string) => {
      if (addr === otherWallet) throw new Error("boom");
      return true;
    });
    mockGetCommunityResolver.mockResolvedValue({ isAdmin });

    const result = await isCommunityAdminOfAny(community, [otherWallet, adminWallet]);

    expect(result).toBe(true);
  });
});
