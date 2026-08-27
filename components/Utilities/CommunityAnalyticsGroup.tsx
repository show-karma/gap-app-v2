"use client";

import { useCommunityAnalyticsGroup } from "@/utilities/analytics/community-group";

interface CommunityAnalyticsGroupProps {
  /** Resolved community UID, or null when the route names no real community. */
  uid: string | null;
}

/**
 * Binds the community group for everything under the community layout. Renders
 * null.
 *
 * A client shim so the server layout — which is where the community is already
 * resolved — can hand the UID to the analytics client without becoming a client
 * component itself.
 */
export function CommunityAnalyticsGroup({ uid }: CommunityAnalyticsGroupProps) {
  useCommunityAnalyticsGroup(uid);
  return null;
}
