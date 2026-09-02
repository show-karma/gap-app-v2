"use client";

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
 * Hook to get URL builder for building community-aware URLs.
 *
 * The community comes from the caller (`targetCommunity`, which `Link` passes
 * as `communityFallback`). It used to also fall back to
 * `useParams<{ community: string }>()?.community`, and that read is gone.
 *
 * Two reasons, and the first is why this is not a behaviour change: **there is
 * no `[community]` segment anywhere in the route tree.** The community routes
 * are `app/t/[tenant]/(chrome)/community/[communityId]/...`, so `params.community`
 * resolved to `undefined` on every route in the app and `targetCommunity` was
 * already the only source this hook ever had.
 *
 * The second is what made it urgent. `Link` renders on effectively every page,
 * so this hook ran `useParams()` everywhere. That is URL data read in a client
 * component, and on any route with a param no build-time sample supplies it
 * stopped the route prerendering outright -- `reports/[runDate]` failed here,
 * through `CommunityCoverBar` in the (cover) layout, and `[grantUid]`,
 * `[programId]` and `[referenceNumber]` would have followed. A hook call is
 * flagged even when nothing uses its value, so the call had to go, not just the
 * fallback.
 */
export function useUrlBuilder(href: string, targetCommunity?: string, useBuilder = true): string {
  const community = typeof targetCommunity === "string" ? targetCommunity : "";
  const isExternal = href.startsWith("http://") || href.startsWith("https://");
  return !isExternal && useBuilder ? getUrlBuilder(community, href) : href;
}
