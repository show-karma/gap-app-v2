import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { communityAdminsService } from "@/services/community-admins.service";
import { useProjectStore } from "@/store";
import type { TeamProfile } from "@/types/team-profile";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { getContributorProfiles } from "@/utilities/indexer/getContributorProfiles";

export const useTeamProfiles = (project: ProjectResponse | undefined) => {
  const setTeamProfiles = useProjectStore((state) => state.setTeamProfiles);

  const uniqueLowercasedAddresses = useMemo(() => {
    const rawAddresses = [
      project?.owner,
      ...(project?.members?.map((member) => member.address).filter(Boolean) || []),
    ].filter(Boolean) as string[];
    return Array.from(new Set(rawAddresses.map((address) => address.toLowerCase())));
  }, [project?.owner, project?.members]);

  const query = useQuery<TeamProfile[] | undefined>({
    queryKey: ["contributor-profiles", uniqueLowercasedAddresses],
    queryFn: async () => {
      if (!project || uniqueLowercasedAddresses.length === 0) return [];
      const profiles = ((await getContributorProfiles(uniqueLowercasedAddresses)) ||
        []) as TeamProfile[];

      try {
        const publicUserProfiles =
          await communityAdminsService.getPublicUserProfiles(uniqueLowercasedAddresses);
        const publicProfilesByAddress = new Map(
          profiles.map((profile) => [profile.recipient.toLowerCase(), profile] as const)
        );

        return uniqueLowercasedAddresses
          .map((address) => {
            const publicProfile = publicProfilesByAddress.get(address);
            const userProfile = publicUserProfiles.get(address);

            if (publicProfile) {
              if (!userProfile?.email) return publicProfile;

              return {
                ...publicProfile,
                data: {
                  ...publicProfile.data,
                  email: userProfile.email,
                },
              };
            }

            if (!userProfile) return undefined;

            return {
              recipient: address,
              data: {
                name: userProfile.name,
                email: userProfile.email,
              },
            } as TeamProfile;
          })
          .filter((profile): profile is TeamProfile => Boolean(profile));
      } catch (error) {
        errorManager(
          "Failed to fetch public user profiles; falling back to contributor profiles",
          error,
          { addresses: uniqueLowercasedAddresses }
        );
        return profiles;
      }
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
