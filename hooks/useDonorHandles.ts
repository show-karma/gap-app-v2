import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CreateHandleRequest,
  createDonorHandle,
  getDonorHandle,
  type ListHandlesOptions,
  listDonorHandles,
  type UpdateHandleRequest,
  updateDonorHandle,
} from "@/services/donor-research.service";
import type { DonorHandle, DonorHandleList } from "@/types/donor-research";

export const donorHandlesQueryKey = (options: ListHandlesOptions = {}) =>
  ["donor-research", "handles", options] as const;

export const donorHandleQueryKey = (handleId: string) =>
  ["donor-research", "handle", handleId] as const;

export function useDonorHandles(options: ListHandlesOptions = {}) {
  return useQuery<DonorHandleList>({
    queryKey: donorHandlesQueryKey(options),
    queryFn: () => listDonorHandles(options),
  });
}

export function useDonorHandle(handleId: string | null) {
  return useQuery<DonorHandle>({
    queryKey: donorHandleQueryKey(handleId ?? ""),
    queryFn: () => getDonorHandle(handleId as string),
    enabled: !!handleId,
  });
}

export function useCreateDonorHandle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateHandleRequest) => createDonorHandle(body),
    // Optimistic refresh — invalidate every list view + seed the
    // single-handle cache so the criteria form's typeahead reflects the
    // new handle immediately without a refetch.
    onSuccess: (handle) => {
      queryClient.invalidateQueries({
        queryKey: ["donor-research", "handles"],
      });
      queryClient.setQueryData(donorHandleQueryKey(handle.id), handle);
    },
  });
}

export function useUpdateDonorHandle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ handleId, body }: { handleId: string; body: UpdateHandleRequest }) =>
      updateDonorHandle(handleId, body),
    onSuccess: (handle) => {
      queryClient.invalidateQueries({
        queryKey: ["donor-research", "handles"],
      });
      queryClient.setQueryData(donorHandleQueryKey(handle.id), handle);
    },
  });
}
