import type { Community } from "@/types/v2/community";

vi.mock("@/utilities/queries/v2/community", () => ({ getCommunityDetails: vi.fn() }));
vi.mock("@/utilities/gapRpcConfig", () => ({ getGapRpcConfig: () => ({}) }));
vi.mock("@/components/Utilities/errorManager", () => ({ errorManager: vi.fn() }));
vi.mock("@show-karma/karma-gap-sdk", () => ({ GAP: { getCommunityResolver: vi.fn() } }));

import { GAP } from "@show-karma/karma-gap-sdk";
import { getCommunityDetails } from "@/utilities/queries/v2/community";
import { isAdminOfAnyCommunity } from "../isCommunityAdmin";

const mockGetCommunityDetails = getCommunityDetails as unknown as ReturnType<typeof vi.fn>;
const mockGetCommunityResolver = (
  GAP as unknown as { getCommunityResolver: ReturnType<typeof vi.fn> }
).getCommunityResolver;

const ADDRESS = "0x1111111111111111111111111111111111111111";
const community = (uid: string): Community => ({ uid, chainID: 10 }) as Community;

/**
 * Returns a resolver whose `isAdmin` is true only for the given community UID,
 * standing in for the on-chain community resolver contract.
 */
const resolverWhereAdminOf = (adminUID: string | null) => ({
  isAdmin: (uid: string) => uid === adminUID,
});

describe("isAdminOfAnyCommunity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCommunityDetails.mockImplementation(async (uid: string) => community(uid));
    mockGetCommunityResolver.mockResolvedValue(resolverWhereAdminOf(null));
  });

  it("should_return_true_when_admin_of_one_community", async () => {
    mockGetCommunityResolver.mockResolvedValue(resolverWhereAdminOf("0xb"));

    const result = await isAdminOfAnyCommunity(["0xa", "0xb"], [ADDRESS]);

    expect(result).toBe(true);
  });

  it("should_return_false_when_admin_of_no_community", async () => {
    const result = await isAdminOfAnyCommunity(["0xa", "0xb"], [ADDRESS]);

    expect(result).toBe(false);
  });

  it("should_return_false_when_no_communities", async () => {
    const result = await isAdminOfAnyCommunity([], [ADDRESS]);

    expect(result).toBe(false);
    expect(mockGetCommunityDetails).not.toHaveBeenCalled();
  });

  it("should_return_false_when_no_addresses", async () => {
    const result = await isAdminOfAnyCommunity(["0xa"], []);

    expect(result).toBe(false);
    expect(mockGetCommunityDetails).not.toHaveBeenCalled();
  });

  it("should_skip_communities_that_fail_to_resolve", async () => {
    mockGetCommunityDetails.mockImplementation(async (uid: string) =>
      uid === "0xb" ? community(uid) : null
    );

    const result = await isAdminOfAnyCommunity(["0xa", "0xb"], [ADDRESS]);

    expect(result).toBe(false);
    expect(mockGetCommunityResolver).toHaveBeenCalledTimes(1);
  });

  it("should_dedupe_repeated_community_uids", async () => {
    await isAdminOfAnyCommunity(["0xa", "0xa"], [ADDRESS]);

    expect(mockGetCommunityDetails).toHaveBeenCalledTimes(1);
  });
});
