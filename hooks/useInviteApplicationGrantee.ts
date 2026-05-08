"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import fetchData from "@/utilities/fetchData";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface AddedTeamMember {
  memberAddress: string;
  memberEmail: string;
  memberName: string;
}

export interface InvitedGranteePayload {
  email: string;
  name: string;
}

export function useInviteApplicationGrantee(referenceNumber: string | undefined) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ email, name }: InvitedGranteePayload): Promise<AddedTeamMember> => {
      if (!referenceNumber) {
        throw new Error("Reference number is required");
      }
      const [response, fetchError] = await fetchData<AddedTeamMember>(
        `/v2/funding-applications/${referenceNumber}/team-members`,
        "POST",
        { memberEmail: email, memberName: name }
      );
      if (fetchError || !response) {
        throw new Error(fetchError ?? "Failed to invite grantee");
      }
      return response;
    },
    onSuccess: async () => {
      if (referenceNumber) {
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.APPLICATIONS.GRANTEE_CONTACTS(referenceNumber),
        });
      }
      toast.success("Grantee invited successfully");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to invite grantee";
      toast.error(message);
    },
  });

  return {
    inviteGrantee: mutation.mutateAsync,
    isInviting: mutation.isPending,
  };
}
