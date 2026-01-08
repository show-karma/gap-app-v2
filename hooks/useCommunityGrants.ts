import { useQuery } from "@tanstack/react-query";
import { getCommunityGrants } from "@/services/community-grants.service";
import type { CommunityGrant } from "@/types/v2/community-grant";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Hook to fetch community grants using V2 API endpoint.
 *
 * @param communitySlug - The community slug or UID
 * @returns Object containing grants array, loading state, error, and refetch function
 */
export function useCommunityGrants(communitySlug: string) {
    const queryKey = QUERY_KEYS.COMMUNITY.GRANTS(communitySlug);

    const { data, isLoading, error, refetch } = useQuery<CommunityGrant[]>({
        queryKey,
        queryFn: () => getCommunityGrants(communitySlug),
        enabled: !!communitySlug,
        staleTime: 5 * 60 * 1000,
    });

    return {
        grants: data || [],
        isLoading,
        error,
        refetch,
    };
}
