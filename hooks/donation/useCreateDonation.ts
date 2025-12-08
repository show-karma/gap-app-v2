import { useMutation, useQueryClient } from "@tanstack/react-query";
import { donationsService } from "@/services/donations.service";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import type { CreateDonationRequest } from "./types";

export const useCreateDonation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateDonationRequest) => donationsService.createDonation(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.DONATIONS.BY_USER(data.donorAddress),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.DONATIONS.BY_PROJECT(data.projectUID),
      });
    },
  });
};
