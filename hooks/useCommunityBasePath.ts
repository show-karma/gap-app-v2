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
  const communityId = params.communityId as string;

  if (isWhitelabel) {
    return "";
  }

  return `/community/${communityId}`;
}
