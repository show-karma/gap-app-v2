"use client";

import { useParams } from "next/navigation";
import { isSharedSubdomain } from "@/src/infrastructure/config/domain-mapping";

/**
 * Builds a URL with proper community prefix for shared subdomains
 */
export const getUrlBuilder = (community: string, href: string): string => {
  if (!community || community === "karma") return href;
  const isShared = typeof window !== "undefined" && isSharedSubdomain(window.location.hostname);
  return isShared ? `/${community}${href}` : href;
};

/**
 * Hook to get URL builder for building community-aware URLs
 */
export function useUrlBuilder(href: string, targetCommunity?: string, useBuilder = true): string {
  const params = useParams<{ community: string }>();
  const community = targetCommunity || params?.community || "";
  const isExternal = href.startsWith("http://") || href.startsWith("https://");
  return !isExternal && useBuilder ? getUrlBuilder(community, href) : href;
}
