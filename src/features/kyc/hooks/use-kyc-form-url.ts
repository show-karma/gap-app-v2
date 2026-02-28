import { useMutation, useQueryClient } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";
import type { KycFormUrlRequest, KycFormUrlResponse, KycVerificationType } from "../types";

interface UseKycFormUrlParams {
  communityIdOrSlug: string;
  projectUID: string;
  verificationType: KycVerificationType;
  walletAddress?: string;
}

export function useKycFormUrl() {
  const queryClient = useQueryClient();

  const mutation = useMutation<KycFormUrlResponse, Error, UseKycFormUrlParams>({
    mutationFn: async ({ communityIdOrSlug, projectUID, verificationType, walletAddress }) => {
      const request: KycFormUrlRequest = {
        projectUID,
        verificationType,
        walletAddress,
      };
      const [data, error] = await fetchData<KycFormUrlResponse>(
        `/v2/communities/${communityIdOrSlug}/kyc-form-url`,
        "POST",
        request
      );
      if (error) {
        throw new Error(typeof error === "string" ? error : "Failed to get KYC form URL");
      }
      return data as KycFormUrlResponse;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["kyc-status", variables.projectUID, variables.communityIdOrSlug],
      });
      queryClient.invalidateQueries({
        queryKey: ["kyc-status-by-app-ref", variables.projectUID],
      });
    },
  });

  return {
    getFormUrl: mutation.mutate,
    getFormUrlAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    formUrl: mutation.data,
  };
}
