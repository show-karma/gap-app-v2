import type { Hex } from "viem";
import { isAddress } from "viem";
import { errorManager } from "@/components/Utilities/errorManager";
import type {
  EfpCommonFollowersResponse,
  EfpFollowingRecord,
  EfpFollowingResponse,
  EfpStatsResult,
  EfpUserStats,
} from "@/types/efp";
import { envVars } from "@/utilities/enviromentVars";

export const EFP_BATCH_SIZE = 10;
export const EFP_FOLLOWING_PAGE_SIZE = 50;
export const EFP_FOLLOWING_MAX = 100;

const DEFAULT_EFP_API_BASE = "https://api.ethfollow.xyz/api/v1";

export function getEfpApiBase(): string {
  return envVars.NEXT_PUBLIC_EFP_API_URL || DEFAULT_EFP_API_BASE;
}

function toHex(address: string): Hex | null {
  const normalized = address.startsWith("0x") ? address : `0x${address}`;
  return isAddress(normalized) ? (normalized.toLowerCase() as Hex) : null;
}

async function fetchEfpStatsForAddress(address: Hex): Promise<EfpStatsResult | null> {
  try {
    const res = await fetch(`${getEfpApiBase()}/users/${address}/stats`);
    if (!res.ok) return null;
    const data = (await res.json()) as EfpUserStats;
    return {
      address,
      followers_count: Number(data.followers_count) || 0,
      following_count: Number(data.following_count) || 0,
    };
  } catch (error) {
    errorManager("EFP stats fetch failed", error, { address });
    return null;
  }
}

export async function fetchEfpStats(addresses: (Hex | string)[]): Promise<EfpStatsResult[]> {
  try {
    const validAddresses = addresses
      .map((addr) => toHex(addr as string))
      .filter((addr): addr is Hex => addr !== null);

    const results: EfpStatsResult[] = [];

    for (let i = 0; i < validAddresses.length; i += EFP_BATCH_SIZE) {
      const batch = validAddresses.slice(i, i + EFP_BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(fetchEfpStatsForAddress));
      for (const item of batchResults) {
        if (item) results.push(item);
      }
    }

    return results;
  } catch (error) {
    errorManager("Error in fetchEfpStats", error, { addresses });
    return [];
  }
}

export async function fetchEfpCommonFollowers(
  target: Hex,
  leader: Hex,
  limit = 8
): Promise<EfpCommonFollowersResponse | null> {
  if (target.toLowerCase() === leader.toLowerCase()) {
    return { results: [], length: 0 };
  }

  try {
    const params = new URLSearchParams({ leader, limit: String(limit) });
    const res = await fetch(
      `${getEfpApiBase()}/users/${target}/commonFollowers?${params.toString()}`
    );
    if (!res.ok) return null;
    return (await res.json()) as EfpCommonFollowersResponse;
  } catch (error) {
    errorManager("EFP commonFollowers fetch failed", error, { target, leader });
    return null;
  }
}

export async function fetchEfpFollowing(
  viewer: Hex,
  options?: { limit?: number; offset?: number }
): Promise<EfpFollowingRecord[] | null> {
  const limit = options?.limit ?? EFP_FOLLOWING_PAGE_SIZE;
  const offset = options?.offset ?? 0;

  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    const res = await fetch(`${getEfpApiBase()}/users/${viewer}/following?${params.toString()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as EfpFollowingResponse;
    return data.following ?? [];
  } catch (error) {
    errorManager("EFP following fetch failed", error, { viewer, offset });
    return null;
  }
}

/** Paginate following until cap or empty page. Returns null on fetch failure. */
export async function fetchEfpFollowingAll(
  viewer: Hex,
  max = EFP_FOLLOWING_MAX
): Promise<EfpFollowingRecord[] | null> {
  const collected: EfpFollowingRecord[] = [];
  let offset = 0;

  while (collected.length < max) {
    const pageLimit = Math.min(EFP_FOLLOWING_PAGE_SIZE, max - collected.length);
    const page = await fetchEfpFollowing(viewer, {
      limit: pageLimit,
      offset,
    });
    if (page === null) return null;
    if (!page.length) break;
    collected.push(...page);
    offset += page.length;
    if (page.length < pageLimit) break;
  }

  return collected.slice(0, max);
}

export function getEfpProfileUrl(address: string): string {
  return `https://efp.app/${address.toLowerCase()}`;
}
