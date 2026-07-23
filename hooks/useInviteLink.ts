import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { keccak256, toHex } from "viem";
import { z } from "zod";
import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { queryClient } from "@/utilities/query-client";

const InviteCodeSchema = z
  .object({
    id: z.string(),
    hash: z.string(),
    signature: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();
const InviteCodeListSchema = z.array(InviteCodeSchema);

type InviteCode = z.infer<typeof InviteCodeSchema>;

interface UseInviteLinkOptions {
  /**
   * Whether the current user is authorized to read the (admin-gated) invite
   * link. `get-invite-link` is guarded by `isProjectAdminMiddleware` and
   * returns 403 for non-admins, so callers MUST pass *resolved* authorization
   * (e.g. from `useProjectAuthorization`). Defaults to `true` for backward
   * compatibility, but admin-gated callers should always supply it.
   */
  enabled?: boolean;
}

/**
 * React Query hook for managing project invite links
 *
 * Features:
 * - Fetches current invite code for a project (admin-gated)
 * - Generates new invite codes
 * - Revokes existing invite codes
 * - Automatic cache invalidation
 */
export const useInviteLink = (
  projectIdOrSlug: string | undefined,
  options?: UseInviteLinkOptions
) => {
  const isEnabled = options?.enabled ?? true;

  // Query for fetching current invite code
  const query = useQuery<InviteCode | null>({
    queryKey: ["invite-code", projectIdOrSlug],
    queryFn: async () => {
      if (!projectIdOrSlug || !isEnabled) return null;

      try {
        const data = await api.get(INDEXER.PROJECT.INVITATION.GET_LINKS(projectIdOrSlug), {
          schema: InviteCodeListSchema,
        });
        if (!data || data.length === 0) return null;
        return data[0];
      } catch (error) {
        // 403 is the expected project-admin denial — treat it as "no invite
        // link" data and stay silent rather than logging to errorManager.
        if (error instanceof HttpError && error.status === 403) {
          return null;
        }
        errorManager("Failed to get current invite code", error);
        return null;
      }
    },
    enabled: !!projectIdOrSlug && isEnabled,
    ...defaultQueryOptions,
  });

  // Mutation for generating new invite code
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!projectIdOrSlug) throw new Error("Project ID is required");

      const messageToSign = Date.now();
      const hexedMessage = keccak256(toHex(messageToSign));

      // TODO(#1775): add zod schema
      return api.post(INDEXER.PROJECT.INVITATION.NEW_CODE(projectIdOrSlug), {
        hash: hexedMessage,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["invite-code", projectIdOrSlug],
      });
    },
    onError: (error) => {
      errorManager("Failed to generate invite code", error, {
        projectId: projectIdOrSlug,
      });
    },
  });

  // Mutation for revoking invite code
  const revokeMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      if (!projectIdOrSlug) throw new Error("Project ID is required");

      // TODO(#1775): add zod schema
      return api.put(INDEXER.PROJECT.INVITATION.REVOKE_CODE(projectIdOrSlug, inviteId));
    },
    onSuccess: () => {
      toast.success("Invite code revoked successfully");
      queryClient.invalidateQueries({
        queryKey: ["invite-code", projectIdOrSlug],
      });
    },
    onError: (error) => {
      errorManager("Failed to revoke invite code", error);
    },
  });

  return {
    // Invite code data
    inviteCode: query.data,

    // Loading states
    isLoading: query.isLoading,
    isGenerating: generateMutation.isPending,
    isRevoking: revokeMutation.isPending,

    // Error states. The fetch query swallows non-403 errors (returns null), so
    // surface the generate mutation's failure explicitly — that's the signal
    // the dialog needs to show an error instead of spinning forever.
    error: query.error,
    isError: query.isError,
    generateError: generateMutation.error,
    isGenerateError: generateMutation.isError,

    // Actions
    generateCode: generateMutation.mutate,
    revokeCode: (inviteId: string) => revokeMutation.mutate(inviteId),
    refetch: query.refetch,

    // Query state
    isSuccess: query.isSuccess,
  };
};

/**
 * Helper hook to build the invite URL
 */
export const useInviteUrl = (
  project: { uid?: string; details?: { slug?: string } } | undefined,
  inviteCode: string | undefined
) => {
  if (!project || !inviteCode) return null;

  const isDev = process.env.NEXT_PUBLIC_ENV === "dev" || process.env.NODE_ENV === "development";
  const baseUrl = isDev ? "staging.karmahq.xyz" : "karmahq.xyz";
  const projectIdentifier = project.details?.slug || project.uid;

  return `https://${baseUrl}/project/${projectIdentifier}?invite-code=${inviteCode}`;
};
