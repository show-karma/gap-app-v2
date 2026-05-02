"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { errorManager } from "@/components/Utilities/errorManager";
import {
  listConnections,
  type OAuthConnection,
  revokeConnection,
} from "@/services/oauth/connections.service";

const CONNECTIONS_QUERY_KEY = ["oauth", "connections"] as const;

export function useOAuthConnections(enabled = true) {
  return useQuery({
    queryKey: CONNECTIONS_QUERY_KEY,
    queryFn: listConnections,
    enabled,
    retry: 1,
    staleTime: 30_000,
  });
}

export function useRevokeOAuthConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeConnection,
    onMutate: async (clientId: string) => {
      await queryClient.cancelQueries({ queryKey: CONNECTIONS_QUERY_KEY });
      const previous = queryClient.getQueryData<OAuthConnection[]>(CONNECTIONS_QUERY_KEY);
      if (previous) {
        queryClient.setQueryData<OAuthConnection[]>(
          CONNECTIONS_QUERY_KEY,
          previous.filter((c) => c.clientId !== clientId)
        );
      }
      return { previous };
    },
    onError: (error, _clientId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CONNECTIONS_QUERY_KEY, context.previous);
      }
      errorManager("Failed to revoke OAuth connection", error);
      toast.error("Could not revoke this connection. Please try again.");
    },
    onSuccess: () => {
      toast.success("Connection revoked");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY });
    },
  });
}
