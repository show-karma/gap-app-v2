"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/utilities/api/client";
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
      // TODO(#1775): add zod schema
      const response = await api.get<ApplicationTeamMember[]>(
        `/v2/funding-applications/${referenceNumber}/team-members`
      );
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
      // TODO(#1775): add zod schema
      return api.post<ApplicationTeamMember>(
        `/v2/funding-applications/${referenceNumber}/team-members`,
        { memberEmail, memberName }
      );
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
      await api.delete(`/v2/funding-applications/${referenceNumber}/team-members/${memberAddress}`);
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
