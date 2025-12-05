import { useMutation } from "@tanstack/react-query";
import { donationsService } from "@/services/donations.service";
import type { OnrampRequest } from "./types";

export const useCreateOnrampUrl = () => {
  return useMutation({
    mutationFn: (request: OnrampRequest) => donationsService.createOnrampUrl(request),
  });
};
