import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CreateHandleRequest,
  createDonorHandle,
  type ListHandlesOptions,
  listDonorHandles,
} from "@/services/donor-research.service";
import type { DonorHandleList } from "@/types/donor-research";

export const donorHandlesQueryKey = (options: ListHandlesOptions = {}) =>
  ["donor-research", "handles", options] as const;

export function useDonorHandles(options: ListHandlesOptions = {}) {
  return useQuery<DonorHandleList>({
    queryKey: donorHandlesQueryKey(options),
    queryFn: () => listDonorHandles(options),
  });
}

export function useCreateDonorHandle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateHandleRequest) => createDonorHandle(body),
    // Refresh every handle list view so the new handle shows up in the
    // criteria-form picker and the report-list filter without a refetch.
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["donor-research", "handles"],
      });
    },
  });
}
