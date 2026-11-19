"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { QUERY_KEYS } from "@/utilities/queryKeys";

const ADD_FAILED_MESSAGE = "Couldn't add the co-applicant. Please try again.";

function addCoApplicantErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    const serverMessage = (error.body as { message?: unknown } | undefined)?.message;
    if (typeof serverMessage === "string" && serverMessage.trim()) return serverMessage;
  }
  return ADD_FAILED_MESSAGE;
}

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
      // TODO(#1775): add zod schema
      const response = await api.post<AddedTeamMember>(
        `/v2/funding-applications/${referenceNumber}/team-members`,
        { memberEmail: email, memberName: name }
      );
      if (!response) {
        throw new Error("Failed to add co-applicant");
      }
      return response;
    },
    onSuccess: async () => {
      if (referenceNumber) {
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.APPLICATIONS.GRANTEE_CONTACTS(referenceNumber),
        });
      }
      toast.success("Co-applicant added");
    },
    onError: (error: unknown) => {
      toast.error(addCoApplicantErrorMessage(error));
    },
  });

  return {
    inviteGrantee: mutation.mutateAsync,
    isInviting: mutation.isPending,
  };
}
