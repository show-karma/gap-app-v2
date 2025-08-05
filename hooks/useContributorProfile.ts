import { useQuery } from "@tanstack/react-query";
import { ContributorProfile } from "@show-karma/karma-gap-sdk";
import { getContributorProfiles } from "@/utilities/indexer/getContributorProfiles";

export const useContributorProfile = (address: string | undefined) => {
  const query = useQuery<ContributorProfile | null>({
    queryKey: ["contributor-profiles", address?.toLowerCase()],
    queryFn: async () => {
      if (!address) return null;

      const profiles = await getContributorProfiles([address?.toLowerCase()]);

      return profiles && profiles.length > 0 ? profiles[0] : null;
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
    isSuccess: query.isSuccess,
  };
};
