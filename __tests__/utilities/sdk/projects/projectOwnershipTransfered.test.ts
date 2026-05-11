import type { Project } from "@show-karma/karma-gap-sdk";
import { GAP } from "@show-karma/karma-gap-sdk";
import { getGapRpcConfig } from "@/utilities/gapRpcConfig";
import { isOwnershipTransfered } from "@/utilities/sdk/projects/projectOwnershipTransfered";

vi.mock("@show-karma/karma-gap-sdk", () => ({
  GAP: {
    getProjectResolver: vi.fn(),
  },
}));

vi.mock("@/utilities/gapRpcConfig", () => ({
  getGapRpcConfig: vi.fn(() => ({ 10: "https://rpc.optimism" })),
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

const mockGetProjectResolver = vi.mocked(GAP.getProjectResolver);

const project = {
  uid: "0xproject",
  chainID: 10,
} as unknown as Project;

const newOwner = "0x6166E1964447E0959bC7c8d543DB3ab82dB65044" as const;

describe("isOwnershipTransfered", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes project.chainID to GAP.getProjectResolver so the SDK uses a static RPC provider for the project's chain (prevents ethers v6 NETWORK_ERROR on wallet/project chain mismatch)", async () => {
    mockGetProjectResolver.mockResolvedValue({
      isOwner: vi.fn().mockResolvedValue(true),
    } as never);

    const signer = { fake: "signer" } as never;

    await isOwnershipTransfered(signer, project, newOwner);

    expect(mockGetProjectResolver).toHaveBeenCalledWith(signer, getGapRpcConfig(), project.chainID);
  });

  it("returns the resolver.isOwner result", async () => {
    const isOwner = vi.fn().mockResolvedValue(true);
    mockGetProjectResolver.mockResolvedValue({ isOwner } as never);

    const result = await isOwnershipTransfered({} as never, project, newOwner);

    expect(result).toBe(true);
    expect(isOwner).toHaveBeenCalledWith(project.uid, newOwner);
  });

  it("returns false when resolver throws (e.g. NETWORK_ERROR)", async () => {
    mockGetProjectResolver.mockRejectedValue(
      new Error('network changed: 1 => 10  (event="changed", code=NETWORK_ERROR, version=6.11.0)')
    );

    const result = await isOwnershipTransfered({} as never, project, newOwner);

    expect(result).toBe(false);
  });
});
