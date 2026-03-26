import { useQuery } from "@tanstack/react-query";
import { DOMAIN_MAPPINGS } from "@/src/infrastructure/config/domain-mapping";
import type { FundingProgram } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";

export interface CommunityPrograms {
  communityId: string;
  communityName: string;
  communityLogo: string;
  programs: FundingProgram[];
}

export function useAllCommunitiesPrograms() {
  return useQuery({
    queryKey: ["all-communities-programs"],
    queryFn: async () => {
      const programsPromises = DOMAIN_MAPPINGS.map(async (community) => {
        const [res, err] = await fetchData<FundingProgram[]>(
          `/v2/funding-program-configs/community/${community.id}?status=active&limit=100`,
          "GET",
          {},
          {},
          {},
          true
        );

        if (err) {
          throw new Error(`Failed to fetch programs for ${community.name}: ${err}`);
        }

        const programs = res || [];
        const enabledPrograms = programs.filter((p) => p.applicationConfig?.isEnabled);

        const sortedPrograms = enabledPrograms.sort((a, b) => {
          const aStartsAt = a.metadata?.startsAt;
          const bStartsAt = b.metadata?.startsAt;
          if (!aStartsAt || !bStartsAt) return 0;
          return new Date(bStartsAt).getTime() - new Date(aStartsAt).getTime();
        });

        return {
          communityId: community.id,
          communityName: community.name,
          communityLogo: community.logoUrl,
          programs: sortedPrograms,
        };
      });

      // TODO: Replace with backend aggregation endpoint GET /v2/funding-programs/discovery
      const allResults = await Promise.allSettled(programsPromises);
      return allResults
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<CommunityPrograms>).value);
    },
    staleTime: 5 * 60 * 1000,
  });
}
