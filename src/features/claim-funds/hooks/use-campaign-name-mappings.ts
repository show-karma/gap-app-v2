"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/utilities/api/client";

interface HedgeyCampaignMapping {
  id: string;
  campaignUUID: string;
  name: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export function useCampaignNameMappings(communityId: string, enabled = true) {
  return useQuery({
    queryKey: ["claim-campaign-name-mappings", communityId],
    queryFn: async () => {
      // TODO(#1775): add zod schema
      const data = await api.get<HedgeyCampaignMapping[]>(
        `/v2/hedgey-campaign-mappings?tenantId=${encodeURIComponent(communityId)}`
      );
      return data ?? [];
    },
    enabled: enabled && !!communityId,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60,
    select: (data) => {
      const map = new Map<string, string>();
      for (const mapping of data) {
        map.set(mapping.campaignUUID, mapping.name);
      }
      return map;
    },
  });
}
