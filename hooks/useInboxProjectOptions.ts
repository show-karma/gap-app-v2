"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

export interface InboxProjectOption {
  id: string;
  title: string;
}

/** Lightweight project names for the admin Action Items filters. */
export function useInboxProjectOptions(communityId: string, programId: string | null) {
  return useQuery<InboxProjectOption[]>({
    queryKey: ["inbox-project-options", communityId, programId],
    enabled: Boolean(communityId),
    queryFn: async () => {
      const qs = programId ? new URLSearchParams({ programId }).toString() : undefined;
      const response = await api.get<{ options: InboxProjectOption[] }>(
        INDEXER.V2.MILESTONE_ACTION_ITEMS.PROJECT_OPTIONS(communityId, qs)
      );
      if (!response) throw new Error("Failed to load projects");
      return response.options;
    },
  });
}
