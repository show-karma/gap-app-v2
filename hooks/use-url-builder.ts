"use client";

import { useParams } from "next/navigation";
import { isSharedSubdomain } from "@/src/infrastructure/config/domain-mapping";

/**
 * Builds a URL with proper community prefix for shared subdomains.
 * Ensures the resulting path is always a valid absolute path.
 */
export const getUrlBuilder = (community: string, href: string): string => {
  if (!community || community === "karma") return href;

  // Ensure href starts with "/" so the resulting path is valid
  const normalizedHref = href.startsWith("/") ? href : `/${href}`;
  const isShared = typeof window !== "undefined" && isSharedSubdomain(window.location.hostname);
  return isShared ? `/${encodeURIComponent(community)}${normalizedHref}` : normalizedHref;
};

/**
 * Hook to get URL builder for building community-aware URLs
 */
export function useUrlBuilder(href: string, targetCommunity?: string, useBuilder = true): string {
  const params = useParams<{ community: string }>();
  const rawCommunity = targetCommunity || params?.community;
  const community = typeof rawCommunity === "string" ? rawCommunity : "";
  const isExternal = href.startsWith("http://") || href.startsWith("https://");
  return !isExternal && useBuilder ? getUrlBuilder(community, href) : href;
}
