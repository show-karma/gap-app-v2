"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import type {
  CreditPack,
  CreditsResponse,
  PurchaseSessionResponse,
} from "../schemas/credit.schema";
import { standaloneEvaluationService } from "../services/standaloneEvaluationService";

export const CREDITS_QUERY_KEYS = {
  all: ["evaluation-credits"] as const,
  balance: () => [...CREDITS_QUERY_KEYS.all, "balance"] as const,
};

export const useCredits = () => {
  const { authenticated } = useAuth();
  return useQuery<CreditsResponse>({
    queryKey: CREDITS_QUERY_KEYS.balance(),
    queryFn: () => standaloneEvaluationService.getCredits(),
    enabled: authenticated,
    staleTime: 30_000,
  });
};

export const usePurchaseCredits = () => {
  const queryClient = useQueryClient();

  return useMutation<PurchaseSessionResponse, Error, { pack: CreditPack }>({
    mutationFn: ({ pack }) => {
      // Both URLs return to /evaluate; Stripe will redirect the browser here
      // after the user completes (or cancels) checkout.
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const successUrl = `${base}/evaluate?stripe=success`;
      const cancelUrl = `${base}/evaluate?stripe=cancel`;
      return standaloneEvaluationService.createPurchaseSession(pack, successUrl, cancelUrl);
    },
    onSuccess: (response) => {
      // After Stripe redirect/return the user lands back on /evaluate; keep credits stale-fresh.
      queryClient.invalidateQueries({ queryKey: CREDITS_QUERY_KEYS.all });
      if (typeof window !== "undefined" && response.url) {
        window.location.href = response.url;
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start purchase");
    },
  });
};
