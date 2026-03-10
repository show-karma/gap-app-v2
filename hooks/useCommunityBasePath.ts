"use client";

import { useParams } from "next/navigation";
import { useWhitelabel } from "@/utilities/whitelabel-context";

/**
 * Returns the base path for community links.
 * - Whitelabel: "" (root-relative, e.g., "/impact")
 * - Normal: "/community/<slug>" (e.g., "/community/optimism/impact")
 */
export function useCommunityBasePath(): string {
  const { isWhitelabel } = useWhitelabel();
  const params = useParams();
  const rawCommunityId = params?.communityId;

  // communityId may be a string, string[] (catch-all), or undefined.
  // Normalise to a single string or null.
  const communityId =
    typeof rawCommunityId === "string" && rawCommunityId.length > 0
      ? rawCommunityId
      : Array.isArray(rawCommunityId) && rawCommunityId.length > 0
        ? rawCommunityId[0]
        : null;

  if (isWhitelabel) {
    return "";
  }

  if (!communityId) {
    return "/community";
  }

  return `/community/${communityId}`;
}
