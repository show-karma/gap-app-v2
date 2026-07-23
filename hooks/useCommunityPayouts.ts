"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { z } from "zod";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

// Types based on backend implementation
export interface AttestationBatchUpdateItem {
  uid: string;
  chainId: number;
  type: "Project" | "Grant";
  payoutAddress?: string; // Only for Project type
  amount?: string; // Only for Grant type
}

const BatchUpdateResponseSchema = z
  .object({
    success: z.array(z.string()),
    failed: z.array(
      z
        .object({
          uid: z.string(),
          error: z.string(),
        })
        .passthrough()
    ),
  })
  .passthrough();
export type BatchUpdateResponse = z.infer<typeof BatchUpdateResponseSchema>;

// Query keys
export const PAYOUT_QUERY_KEYS = {
  all: ["payouts"] as const,
  community: (communityId: string) => [...PAYOUT_QUERY_KEYS.all, "community", communityId] as const,
};

/**
 * Hook to batch update payouts for projects and grants
 */
export const useBatchUpdatePayouts = () => {
  const queryClient = useQueryClient();

  return useMutation<
    BatchUpdateResponse,
    Error,
    {
      communityIdOrSlug: string;
      updates: AttestationBatchUpdateItem[];
    }
  >({
    mutationFn: async ({ communityIdOrSlug, updates }) => {
      return api.patch<BatchUpdateResponse>(
        INDEXER.COMMUNITY.BATCH_UPDATE(communityIdOrSlug),
        { updates },
        { schema: BatchUpdateResponseSchema }
      );
    },
    onSuccess: (data, variables) => {
      const { success, failed } = data;

      if (success.length > 0) {
        toast.success(`Successfully updated ${success.length} items`);
      }

      if (failed.length > 0) {
        toast.error(`Failed to update ${failed.length} items`);
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: PAYOUT_QUERY_KEYS.community(variables.communityIdOrSlug),
      });

      // Also invalidate grants queries as they might be affected
      queryClient.invalidateQueries({
        queryKey: ["grants"],
      });

      // Invalidate projects queries
      queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
    },
    onError: (error: Error) => {
      console.error("Batch update error:", error);
      toast.error(error.message || "Failed to update payouts");
    },
  });
};
