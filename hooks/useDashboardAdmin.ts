import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Community } from "@/types/v2/community";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { PAGES } from "@/utilities/pages";

interface AdminCommunitiesResponse {
  communities: Community[];
}

interface CommunityMetricsResponse {
  communityUID: string;
  totalPrograms: number;
  enabledPrograms: number;
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  revisionRequestedApplications: number;
  underReviewApplications: number;
}

export interface DashboardAdminCommunity {
  uid: string;
  name: string;
  slug: string;
  logoUrl?: string;
  chainID: number;
  activeProgramsCount: number;
  pendingApplicationsCount: number;
  manageUrl: string;
}

const fetchAdminCommunities = async (): Promise<Community[]> => {
  const [data, error] = await fetchData<AdminCommunitiesResponse>(
    INDEXER.V2.USER.ADMIN_COMMUNITIES(),
    "GET",
    {},
    {},
    {},
    true,
    false
  );

  if (error || !data) {
    throw new Error(error || "Failed to fetch admin communities");
  }

  return data.communities ?? [];
};

const fetchCommunityMetrics = async (communityId: string): Promise<CommunityMetricsResponse> => {
  const [data, error] = await fetchData<CommunityMetricsResponse>(
    INDEXER.V2.COMMUNITY_PROGRAM_METRICS(communityId),
    "GET",
    {},
    {},
    {},
    false,
    false
  );

  if (error || !data) {
    throw new Error(error || "Failed to fetch community metrics");
  }

  return data;
};

export function useDashboardAdmin() {
  const { authenticated, address } = useAuth();

  const query = useQuery({
    queryKey: ["dashboardAdmin", address],
    enabled: Boolean(address && authenticated),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const communities = await fetchAdminCommunities();

      const results = await Promise.allSettled(
        communities.map(async (community) => {
          const metrics = await fetchCommunityMetrics(community.uid);
          return { community, metrics };
        })
      );

      const mapped = results.map((result, index): DashboardAdminCommunity => {
        const community = communities[index];
        const metrics = result.status === "fulfilled" ? result.value.metrics : null;

        return {
          uid: community.uid,
          name: community.details.name,
          slug: community.details.slug,
          logoUrl: community.details.logoUrl || community.details.imageURL,
          chainID: community.chainID,
          activeProgramsCount: metrics?.enabledPrograms ?? metrics?.totalPrograms ?? 0,
          pendingApplicationsCount: metrics?.pendingApplications ?? 0,
          manageUrl: PAGES.ADMIN.ROOT(community.details.slug),
        };
      });

      // Deduplicate by slug — a community can exist on multiple chains
      const bySlug = new Map<string, DashboardAdminCommunity>();
      for (const c of mapped) {
        const existing = bySlug.get(c.slug);
        if (existing) {
          existing.activeProgramsCount += c.activeProgramsCount;
          existing.pendingApplicationsCount += c.pendingApplicationsCount;
        } else {
          bySlug.set(c.slug, { ...c });
        }
      }
      return Array.from(bySlug.values());
    },
  });

  return {
    communities: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
