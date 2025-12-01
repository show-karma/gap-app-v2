import type { ContributorProfile } from "@show-karma/karma-gap-sdk";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useProjectStore } from "@/store";
import type { ProjectV2Response } from "@/types/project";
import { getContributorProfiles } from "@/utilities/indexer/getContributorProfiles";

export const useTeamProfiles = (project: ProjectV2Response | undefined) => {
  const setTeamProfiles = useProjectStore((state) => state.setTeamProfiles);

  const rawAddresses = project?.members?.map((member) => member.address).filter(Boolean) || [];
  const uniqueLowercasedAddresses = Array.from(
    new Set(rawAddresses.map((address) => address.toLowerCase()))
  );

  const query = useQuery<ContributorProfile[] | undefined>({
    queryKey: ["contributor-profiles", uniqueLowercasedAddresses],
    queryFn: async () => {
      if (!project || uniqueLowercasedAddresses.length === 0) return [];
      const profiles = (await getContributorProfiles(uniqueLowercasedAddresses)) || [];
      return profiles;
    },
    enabled: uniqueLowercasedAddresses.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  useEffect(() => {
    if (query.data) {
      setTeamProfiles(query.data);
    }
  }, [query.data, setTeamProfiles]);

  return {
    // Team profiles data
    teamProfiles: query.data,

    // Loading states
    isLoading: query.isLoading,
    isFetching: query.isFetching,

    // Error handling
    error: query.error,
    isError: query.isError,

    // Actions
    refetch: query.refetch,

    // Query state
    isSuccess: query.isSuccess,
  };
};
