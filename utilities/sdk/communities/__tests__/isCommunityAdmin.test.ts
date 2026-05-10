import { GAP } from "@show-karma/karma-gap-sdk";
import { errorManager } from "@/components/Utilities/errorManager";
import { getGapRpcConfig } from "@/utilities/gapRpcConfig";
import { isCommunityAdminOf } from "../isCommunityAdmin";

vi.mock("@show-karma/karma-gap-sdk", () => ({
  GAP: {
    getCommunityResolver: vi.fn(),
  },
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

vi.mock("@/utilities/gapRpcConfig", () => ({
  getGapRpcConfig: vi.fn(() => ({ 10: "https://optimism-rpc.example" })),
}));

const mockGetCommunityResolver = vi.mocked(GAP.getCommunityResolver);
const mockErrorManager = vi.mocked(errorManager);
const mockGetGapRpcConfig = vi.mocked(getGapRpcConfig);

const mockCommunity = {
  uid: "0x1234567890123456789012345678901234567890",
  chainID: 10,
} as const;

const mockAddress = "0xabc123";
const mockSigner = { provider: { getNetwork: vi.fn() } };

describe("isCommunityAdminOf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the community chain ID when creating the resolver", async () => {
    const mockResolver = {
      isAdmin: vi.fn().mockResolvedValue(true),
    };

    mockGetCommunityResolver.mockResolvedValue(mockResolver as never);

    const result = await isCommunityAdminOf(
      mockCommunity as never,
      mockAddress,
      mockSigner as never
    );

    expect(result).toBe(true);
    expect(mockGetGapRpcConfig).toHaveBeenCalledTimes(1);
    expect(mockGetCommunityResolver).toHaveBeenCalledWith(
      mockSigner,
      mockGetGapRpcConfig.mock.results[0]?.value,
      mockCommunity.chainID
    );
    expect(mockResolver.isAdmin).toHaveBeenCalledWith(mockCommunity.uid, mockAddress);
  });

  it("returns false and reports the error when resolver lookup fails", async () => {
    const resolverError = new Error("unsupported network");
    mockGetCommunityResolver.mockRejectedValue(resolverError);

    const result = await isCommunityAdminOf(
      mockCommunity as never,
      mockAddress,
      mockSigner as never
    );

    expect(result).toBe(false);
    expect(mockErrorManager).toHaveBeenCalledWith(
      `Error checking if user ${mockAddress} is community(${mockCommunity.uid}) admin`,
      resolverError,
      {
        uid: mockCommunity.uid,
        chainID: mockCommunity.chainID,
        address: mockAddress,
      }
    );
  });
});
