"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

export interface InboxProjectOption {
  id: string;
  title: string;
}

/**
 * Lightweight project names for the admin inbox filters.
 *
 * `onlyWithActionItems` scopes the list to projects that have action items —
 * the Action Items view wants that, the Milestones queue wants every project.
 */
export function useInboxProjectOptions(
  communityId: string,
  programId: string | null,
  onlyWithActionItems = false
) {
  return useQuery<InboxProjectOption[]>({
    queryKey: QUERY_KEYS.inboxProjectOptions(communityId, programId, onlyWithActionItems),
    enabled: Boolean(communityId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (programId) params.set("programId", programId);
      if (onlyWithActionItems) params.set("withActionItems", "true");
      const qs = params.toString() || undefined;
      const response = await api.get<{ options: InboxProjectOption[] }>(
        INDEXER.V2.MILESTONE_ACTION_ITEMS.PROJECT_OPTIONS(communityId, qs)
      );
      if (!response) throw new Error("Failed to load projects");
      return response.options;
    },
  });
}
