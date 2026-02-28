"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";
import { useApplicationAccess } from "./use-application-access";

interface ApplicationTeamMember {
  memberAddress: string;
  memberEmail: string;
  memberName: string;
  addedAt: string;
}

export interface UseTeamMembersReturn {
  members: ApplicationTeamMember[];
  isLoading: boolean;
  error: Error | null;
  addMember: (memberEmail: string, memberName: string) => Promise<ApplicationTeamMember>;
  removeMember: (memberAddress: string) => Promise<void>;
  isAdding: boolean;
  isRemoving: boolean;
}

export function useTeamMembers(
  communityId: string,
  referenceNumber: string | undefined
): UseTeamMembersReturn {
  const { isOwner } = useApplicationAccess(communityId, referenceNumber);
  const queryClient = useQueryClient();

  const queryKey = ["team-members", communityId, referenceNumber || ""];

  const {
    data: members = [],
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!referenceNumber) {
        throw new Error("Reference number is required");
      }
      const [response, fetchError] = await fetchData<ApplicationTeamMember[]>(
        `/v2/funding-applications/${referenceNumber}/team-members`
      );
      if (fetchError) throw new Error(fetchError);
      return response ?? [];
    },
    enabled: !!referenceNumber && isOwner,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });

  const addMutation = useMutation({
    mutationFn: async ({
      memberEmail,
      memberName,
    }: {
      memberEmail: string;
      memberName: string;
    }) => {
      if (!referenceNumber) {
        throw new Error("Reference number is required");
      }
      const [response, fetchError] = await fetchData<ApplicationTeamMember>(
        `/v2/funding-applications/${referenceNumber}/team-members`,
        "POST",
        { memberEmail, memberName }
      );
      if (fetchError || !response) throw new Error(fetchError ?? "Failed to add team member");
      return response;
    },
    onSuccess: (newMember) => {
      queryClient.setQueryData<ApplicationTeamMember[]>(queryKey, (old) => [
        ...(old || []),
        newMember,
      ]);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (memberAddress: string) => {
      if (!referenceNumber) {
        throw new Error("Reference number is required");
      }
      const [, fetchError] = await fetchData(
        `/v2/funding-applications/${referenceNumber}/team-members/${memberAddress}`,
        "DELETE"
      );
      if (fetchError) throw new Error(fetchError);
    },
    onSuccess: (_, memberAddress) => {
      queryClient.setQueryData<ApplicationTeamMember[]>(
        queryKey,
        (old) =>
          old?.filter((m) => m.memberAddress.toLowerCase() !== memberAddress.toLowerCase()) || []
      );
    },
  });

  const addMember = async (memberEmail: string, memberName: string) => {
    return addMutation.mutateAsync({ memberEmail, memberName });
  };

  const removeMember = async (memberAddress: string) => {
    await removeMutation.mutateAsync(memberAddress);
  };

  return {
    members,
    isLoading,
    error: error as Error | null,
    addMember,
    removeMember,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}
