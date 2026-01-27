/**
 * Centralized URL generation for the Funding Platform
 *
 * Consolidates URL generation logic that was previously duplicated across:
 * - app/community/[communityId]/admin/funding-platform/page.tsx
 * - components/QuestionBuilder/SettingsConfiguration.tsx
 * - src/features/funding-map/components/funding-program-details-dialog.tsx
 */

import { FUNDING_PLATFORM_DOMAINS } from "@/src/features/funding-map/utils/funding-platform-domains";
import { envVars } from "./enviromentVars";

/**
 * Get the base domain for a community's funding platform
 */
function getDomainForCommunity(communityId: string): string {
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
export function getProgramApplyUrl(communityId: string, programId: string): string {
  const domain = getDomainForCommunity(communityId);
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
  accessCode?: string
): string {
  const baseUrl = getProgramApplyUrl(communityId, programId);
  return accessCode ? `${baseUrl}?accessCode=${encodeURIComponent(accessCode)}` : baseUrl;
}

/**
 * Generate the browse applications URL for public viewing
 *
 * @param communityId - The community slug
 * @param programId - The program ID
 * @returns The full URL to browse applications
 */
export function getBrowseApplicationsUrl(communityId: string, programId: string): string {
  const domain = getDomainForCommunity(communityId);
  return `${domain}/browse-applications?programId=${programId}`;
}

/**
 * Generate the program details page URL
 *
 * @param communityId - The community slug
 * @param programId - The program ID
 * @returns The full URL to the program details page
 */
export function getProgramPageUrl(communityId: string, programId: string): string {
  const domain = getDomainForCommunity(communityId);
  return `${domain}/programs/${programId}`;
}
