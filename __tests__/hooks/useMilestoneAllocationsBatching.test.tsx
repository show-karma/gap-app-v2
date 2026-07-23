/**
 * @file Batching behavior for public payout-config allocation hooks.
 * @description The milestone-report page fans out 50-200+ grants; per-grant
 * fetches burst past the indexer's 30 req/min/IP per-route limit
 * (GAP-FRONTEND-245). These tests pin the request shape: one community-wide
 * request when a communityUID is available, and an allocation map identical to
 * the per-grant path.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useCommunityMilestoneAllocations,
  useMilestoneAllocationsByGrants,
} from "@/hooks/useCommunityMilestoneAllocations";
import type { PayoutGrantConfig } from "@/src/features/payout-disbursement/types/payout-disbursement";
import type { CommunityMilestoneUpdate } from "@/types/community-updates";

vi.mock("@/src/features/payout-disbursement/services/payout-disbursement.service", () => ({
  getPayoutConfigByGrantPublic: vi.fn(),
  getPayoutConfigsByCommunityPublic: vi.fn(),
}));

import * as payoutService from "@/src/features/payout-disbursement/services/payout-disbursement.service";

const mockByGrant = payoutService.getPayoutConfigByGrantPublic as ReturnType<typeof vi.fn>;
const mockByCommunity = payoutService.getPayoutConfigsByCommunityPublic as ReturnType<typeof vi.fn>;

const COMMUNITY_UID = "0xcommunity";

function makeConfig(grantUID: string, amount: string, milestoneUID: string): PayoutGrantConfig {
  return {
    grantUID,
    tokenAddress: null,
    chainID: null,
    milestoneAllocations: [{ id: `a-${grantUID}`, milestoneUID, amount }],
  } as unknown as PayoutGrantConfig;
}

const CONFIGS = [
  makeConfig("g1", "1000", "m1"),
  makeConfig("g2", "2000", "m2"),
  makeConfig("g3", "3000", "m3"),
];
const GRANT_UIDS = ["g1", "g2", "g3"];

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  // No gcTime override: seeded per-grant entries have no observer while
  // batching, and a 0 gcTime would collect them before they can be asserted.
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});

afterEach(() => {
  queryClient.clear();
});

describe("useMilestoneAllocationsByGrants — batched (communityUID supplied)", () => {
  it("issues exactly one community request and no per-grant requests", async () => {
    mockByCommunity.mockResolvedValue(CONFIGS);

    const { result } = renderHook(
      () => useMilestoneAllocationsByGrants(GRANT_UIDS, undefined, { communityUID: COMMUNITY_UID }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockByCommunity).toHaveBeenCalledTimes(1);
    expect(mockByCommunity).toHaveBeenCalledWith(COMMUNITY_UID);
    expect(mockByGrant).not.toHaveBeenCalled();
  });

  it("builds the same allocation and total maps as the per-grant path", async () => {
    mockByCommunity.mockResolvedValue(CONFIGS);
    mockByGrant.mockImplementation(
      async (uid: string) => CONFIGS.find((c) => c.grantUID === uid) ?? null
    );

    const batched = renderHook(
      () => useMilestoneAllocationsByGrants(GRANT_UIDS, undefined, { communityUID: COMMUNITY_UID }),
      { wrapper }
    );
    await waitFor(() => expect(batched.result.current.isLoading).toBe(false));

    queryClient.clear();
    const perGrant = renderHook(() => useMilestoneAllocationsByGrants(GRANT_UIDS), { wrapper });
    await waitFor(() => expect(perGrant.result.current.isLoading).toBe(false));

    expect([...batched.result.current.allocationMap.entries()]).toEqual([
      ...perGrant.result.current.allocationMap.entries(),
    ]);
    expect([...batched.result.current.grantTotalMap.entries()]).toEqual([
      ...perGrant.result.current.grantTotalMap.entries(),
    ]);
  });

  it("treats a grant missing from the community response as having no config, without a fallback request", async () => {
    mockByCommunity.mockResolvedValue([CONFIGS[0], CONFIGS[1]]);

    const { result } = renderHook(
      () => useMilestoneAllocationsByGrants(GRANT_UIDS, undefined, { communityUID: COMMUNITY_UID }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockByGrant).not.toHaveBeenCalled();
    expect(result.current.allocationMap.has("m1")).toBe(true);
    expect(result.current.allocationMap.has("m3")).toBe(false);
  });

  it("seeds each grant's public cache entry so other consumers reuse it", async () => {
    mockByCommunity.mockResolvedValue(CONFIGS);

    const { result } = renderHook(
      () => useMilestoneAllocationsByGrants(GRANT_UIDS, undefined, { communityUID: COMMUNITY_UID }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(queryClient.getQueryData(["payoutConfig", "grant", "g1", "public"])).toEqual(CONFIGS[0]);
    expect(queryClient.getQueryData(["payoutConfig", "grant", "g3", "public"])).toEqual(CONFIGS[2]);
  });

  it("degrades to an empty map when the community request fails, without per-grant fallback", async () => {
    mockByCommunity.mockRejectedValue(new Error("rate limited"));

    const { result } = renderHook(
      () => useMilestoneAllocationsByGrants(GRANT_UIDS, undefined, { communityUID: COMMUNITY_UID }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockByGrant).not.toHaveBeenCalled();
    expect(result.current.allocationMap.size).toBe(0);
  });
});

describe("useMilestoneAllocationsByGrants — per-grant (no communityUID)", () => {
  it("falls back to one request per grant", async () => {
    mockByGrant.mockImplementation(
      async (uid: string) => CONFIGS.find((c) => c.grantUID === uid) ?? null
    );

    const { result } = renderHook(() => useMilestoneAllocationsByGrants(GRANT_UIDS), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockByCommunity).not.toHaveBeenCalled();
    expect(mockByGrant).toHaveBeenCalledTimes(GRANT_UIDS.length);
  });
});

describe("useCommunityMilestoneAllocations — community derivation", () => {
  const milestone = (uid: string, grantUID: string, communityUID: string) =>
    ({ uid, communityUID, grant: { uid: grantUID } }) as unknown as CommunityMilestoneUpdate;

  it("batches when every milestone shares one community", async () => {
    mockByCommunity.mockResolvedValue(CONFIGS);

    const milestones = [milestone("m1", "g1", COMMUNITY_UID), milestone("m2", "g2", COMMUNITY_UID)];

    const { result } = renderHook(() => useCommunityMilestoneAllocations(milestones), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockByCommunity).toHaveBeenCalledTimes(1);
    expect(mockByGrant).not.toHaveBeenCalled();
  });

  it("does not batch a list spanning multiple communities", async () => {
    mockByGrant.mockImplementation(
      async (uid: string) => CONFIGS.find((c) => c.grantUID === uid) ?? null
    );

    const milestones = [
      milestone("m1", "g1", COMMUNITY_UID),
      milestone("m2", "g2", "0xother-community"),
    ];

    const { result } = renderHook(() => useCommunityMilestoneAllocations(milestones), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockByCommunity).not.toHaveBeenCalled();
    expect(mockByGrant).toHaveBeenCalledTimes(2);
  });
});
