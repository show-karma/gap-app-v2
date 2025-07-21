import { useQuery, useMutation } from "@tanstack/react-query";
import fetchData from "@/lib/utils/fetch-data";
import { INDEXER } from "@/services/indexer";
import errorManager from "@/lib/utils/error-manager";
import { keccak256, toHex } from "viem";
import toast from "react-hot-toast";
import { defaultQueryOptions } from "@/lib/queries/defaultOptions";
import { queryClient } from "@/components/providers/wagmi-provider";

interface InviteCode {
  id: string;
  hash: string;
  signature: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * React Query hook for managing project invite links
 *
 * Features:
 * - Fetches current invite code for a project
 * - Generates new invite codes
 * - Revokes existing invite codes
 * - Automatic cache invalidation
 */
export const useInviteLink = (projectIdOrSlug: string | undefined) => {
  // Query for fetching current invite code
  const query = useQuery<InviteCode | null>({
    queryKey: ["invite-code", projectIdOrSlug],
    queryFn: async () => {
      if (!projectIdOrSlug) return null;

      try {
        const [data, error] = await fetchData(
          INDEXER.PROJECT.INVITATION.GET_LINKS(projectIdOrSlug)
        );
        if (error) throw error;
        if (!data || data.length === 0) return null;
        return data[0] as InviteCode;
      } catch (e) {
        errorManager("Failed to get current invite code", e);
        return null;
      }
    },
    enabled: !!projectIdOrSlug,
    ...defaultQueryOptions,
  });

  // Mutation for generating new invite code
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!projectIdOrSlug) throw new Error("Project ID is required");

      const messageToSign = new Date().getTime();
      const hexedMessage = keccak256(toHex(messageToSign));

      const [data, error] = await fetchData(
        INDEXER.PROJECT.INVITATION.NEW_CODE(projectIdOrSlug),
        "POST",
        {
          hash: hexedMessage,
        }
      );

      if (error) throw error;
      return data;
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

      const [response, error] = await fetchData(
        INDEXER.PROJECT.INVITATION.REVOKE_CODE(projectIdOrSlug, inviteId),
        "PUT"
      );

      if (error) throw error;
      return response;
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

    // Error states
    error: query.error,
    isError: query.isError,

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
  project: { uid?: string; details?: { data: { slug?: string } } } | undefined,
  inviteCode: string | undefined
) => {
  if (!project || !inviteCode) return null;

  const isDev =
    process.env.NEXT_PUBLIC_ENV === "dev" ||
    process.env.NODE_ENV === "development";
  const baseUrl = isDev ? "gapstag.karmahq.xyz" : "gap.karmahq.xyz";
  const projectIdentifier = project.details?.data.slug || project.uid;

  return `https://${baseUrl}/project/${projectIdentifier}/?invite-code=${inviteCode}`;
};
