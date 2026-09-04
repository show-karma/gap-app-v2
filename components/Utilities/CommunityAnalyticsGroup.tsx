"use client";

import { useCommunityAnalyticsGroup } from "@/utilities/analytics/community-group";

interface CommunityAnalyticsGroupProps {
  /** Resolved community UID, or null when the route names no real community. */
  uid: string | null;
  /**
   * The community's canonical slug as the API resolved it — never the raw URL
   * segment, which `/community/[communityId]` also accepts as a uid.
   */
  slug: string | null;
}

/**
 * Publishes the community group for everything under the community layout.
 * Renders null.
 *
 * A client shim so the server layout — which is where the community is already
 * resolved — can hand the uid and slug to the analytics store without becoming
 * a client component itself.
 */
export function CommunityAnalyticsGroup({ uid, slug }: CommunityAnalyticsGroupProps) {
  useCommunityAnalyticsGroup(uid, slug);
  return null;
}
