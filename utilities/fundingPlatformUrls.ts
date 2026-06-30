/**
 * Centralized URL generation for the Funding Platform
 *
 * Consolidates URL generation logic that was previously duplicated across:
 * - app/community/[communityId]/manage/funding-platform/page.tsx
 * - components/QuestionBuilder/SettingsConfiguration.tsx
 * - src/features/funding-map/components/funding-program-details-dialog.tsx
 */

import { FUNDING_PLATFORM_DOMAINS } from "@/src/features/funding-map/utils/funding-platform-domains";
import { envVars } from "./enviromentVars";
import { PAGES } from "./pages";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

/**
 * Decides whether funding-platform links should point at the external tenant domains
 * (e.g. `https://grants.optimism.io`) or stay same-origin.
 *
 * Why not NODE_ENV or NEXT_PUBLIC_ENV: the QA pipeline that surfaced the "Community not
 * found" trap runs *production* builds on localhost (so NODE_ENV is "production"), and the
 * local `.env` sets NEXT_PUBLIC_ENV="staging". Neither distinguishes "running on a
 * developer/QA machine" from "deployed". The only reliable signal is the runtime host.
 *
 * Resolution order:
 *  1. Explicit `NEXT_PUBLIC_FUNDING_PLATFORM_EXTERNAL_LINKS` override ("true"/"false").
 *  2. Runtime host: on a local host (localhost/127.0.0.1/...), default to same-origin links
 *     so dev/QA never gets sent cross-origin to a host whose DB lacks the local program.
 *  3. SSR (no `window`): fall back to external links (the historical behavior), which is
 *     safe because every consumer of these helpers is a client component.
 */
export function shouldUseExternalFundingPlatformLinks(): boolean {
  const override = envVars.NEXT_PUBLIC_FUNDING_PLATFORM_EXTERNAL_LINKS;
  if (override === "true") return true;
  if (override === "false") return false;

  if (typeof window === "undefined") {
    return true;
  }

  return !LOCAL_HOSTNAMES.has(window.location.hostname);
}

/**
 * Same-origin links apply when there is no whitelabel origin to honor and external
 * tenant-domain links are disabled (local dev/QA by default, or forced off via env).
 * In that regime the helpers return the canonical PAGES.COMMUNITY routes directly.
 */
function usesSameOriginLinks(whitelabelOrigin?: string): boolean {
  return !whitelabelOrigin && !shouldUseExternalFundingPlatformLinks();
}

/**
 * Get the base path/domain for a community's funding platform links.
 *
 * - Whitelabel mode: the app *is* the funding platform, so links stay on the current origin.
 * - External links enabled (deployed staging/production, or forced via the env override):
 *   the hardcoded external tenant domain.
 * - External links disabled (local dev/QA by default, or forced off): the same-origin base
 *   `/community/${communityId}`. This is required — bare `/programs/...` and
 *   `/browse-applications` paths only resolve under the `/community/<slug>` prefix on the
 *   standard host (middleware only rewrites bare paths on whitelabel domains).
 *
 * @param communityId - The community slug
 * @param whitelabelOrigin - When running in whitelabel mode, the current origin
 *   (e.g. `window.location.origin`) to use instead of the hardcoded domain.
 */
export function getDomainForCommunity(communityId: string, whitelabelOrigin?: string): string {
  // In whitelabel mode the app *is* the funding platform, so links should
  // stay on the same origin rather than pointing to an external domain.
  if (whitelabelOrigin) {
    return whitelabelOrigin;
  }

  if (!shouldUseExternalFundingPlatformLinks()) {
    // Same-origin: the canonical community base route (e.g. /community/optimism), so any
    // appended sub-paths resolve on the current host.
    return PAGES.COMMUNITY.ALL_GRANTS(communityId);
  }

  if (communityId in FUNDING_PLATFORM_DOMAINS) {
    const domain = FUNDING_PLATFORM_DOMAINS[communityId as keyof typeof FUNDING_PLATFORM_DOMAINS];
    return envVars.isDev ? domain.dev : domain.prod;
  }
  // Fall back to shared domain with community path
  return envVars.isDev
    ? `${FUNDING_PLATFORM_DOMAINS.shared.dev}/${communityId}`
    : `${FUNDING_PLATFORM_DOMAINS.shared.prod}/${communityId}`;
}

/**
 * Generate the program apply URL
 *
 * @param communityId - The community slug (e.g., "filecoin", "arbitrum")
 * @param programId - The program ID
 * @returns The full URL to apply for the program
 */
export function getProgramApplyUrl(
  communityId: string,
  programId: string,
  whitelabelOrigin?: string
): string {
  if (usesSameOriginLinks(whitelabelOrigin)) {
    return PAGES.COMMUNITY.PROGRAM_APPLY(communityId, programId);
  }
  const domain = getDomainForCommunity(communityId, whitelabelOrigin);
  return `${domain}/programs/${programId}/apply`;
}

/**
 * Generate the program apply URL with optional access code
 *
 * @param communityId - The community slug
 * @param programId - The program ID
 * @param accessCode - Optional access code for gated applications
 * @returns The full URL to apply, with access code if provided
 */
export function getGatedApplyUrl(
  communityId: string,
  programId: string,
  accessCode?: string,
  whitelabelOrigin?: string
): string {
  const baseUrl = getProgramApplyUrl(communityId, programId, whitelabelOrigin);
  return accessCode ? `${baseUrl}?accessCode=${encodeURIComponent(accessCode)}` : baseUrl;
}

/**
 * Generate the browse applications URL for public viewing
 *
 * @param communityId - The community slug
 * @param programId - The program ID
 * @returns The full URL to browse applications
 */
export function getBrowseApplicationsUrl(
  communityId: string,
  programId: string,
  whitelabelOrigin?: string
): string {
  if (usesSameOriginLinks(whitelabelOrigin)) {
    return `${PAGES.COMMUNITY.BROWSE_APPLICATIONS(communityId)}?programId=${programId}`;
  }
  const domain = getDomainForCommunity(communityId, whitelabelOrigin);
  return `${domain}/browse-applications?programId=${programId}`;
}

/**
 * Generate the applicant-facing application detail URL.
 *
 * This is the same route that serves both the public and the private (owner)
 * view — `ApplicationPageClient` resolves the viewer role client-side, so an
 * authenticated grantee lands on their private view. The route is keyed by
 * `referenceNumber`, not the application's internal id.
 *
 * @param communityId - The community slug
 * @param referenceNumber - The application's reference number
 * @param whitelabelOrigin - Current origin when running in whitelabel mode
 * @returns The full URL to the application detail page
 */
export function getApplicationDetailUrl(
  communityId: string,
  referenceNumber: string,
  whitelabelOrigin?: string
): string {
  if (usesSameOriginLinks(whitelabelOrigin)) {
    return PAGES.COMMUNITY.APPLICATION_DETAIL(communityId, referenceNumber);
  }
  const domain = getDomainForCommunity(communityId, whitelabelOrigin);
  return `${domain}/applications/${referenceNumber}`;
}

/**
 * Generate the program details page URL
 *
 * @param communityId - The community slug
 * @param programId - The program ID
 * @returns The full URL to the program details page
 */
export function getProgramPageUrl(
  communityId: string,
  programId: string,
  whitelabelOrigin?: string
): string {
  if (usesSameOriginLinks(whitelabelOrigin)) {
    return PAGES.COMMUNITY.PROGRAM_DETAIL(communityId, programId);
  }
  const domain = getDomainForCommunity(communityId, whitelabelOrigin);
  return `${domain}/programs/${programId}`;
}
