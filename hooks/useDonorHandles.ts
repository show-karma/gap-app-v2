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

const donorHandlesQueryKey = (options: ListHandlesOptions = {}) =>
  ["donor-research", "handles", options] as const;

export const donorHandleQueryKey = (handleId: string) =>
  ["donor-research", "handle", handleId] as const;

export function useDonorHandles(options: ListHandlesOptions = {}) {
  return useQuery<DonorHandleList>({
    queryKey: donorHandlesQueryKey(options),
    queryFn: () => listDonorHandles(options),
  });
}

/** Fetches a single donor handle for the detail page (U7). */
export function useDonorHandle(handleId: string | null | undefined) {
  return useQuery<DonorHandle>({
    queryKey: donorHandleQueryKey(handleId ?? ""),
    queryFn: () => getDonorHandle(handleId as string),
    enabled: !!handleId,
  });
}

interface UpdateHandleContext {
  previous: DonorHandle | undefined;
}

/**
 * Patches a handle (the detail page's private "Notes" section) with an
 * optimistic update + rollback. Invalidates the single-handle query and
 * every handle-list view so the picker label stays in sync.
 */
export function useUpdateDonorHandle(handleId: string) {
  const queryClient = useQueryClient();
  const key = donorHandleQueryKey(handleId);

  return useMutation<DonorHandle, Error, UpdateHandleRequest, UpdateHandleContext>({
    mutationFn: (body) => updateDonorHandle(handleId, body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DonorHandle>(key);
      if (previous) {
        queryClient.setQueryData<DonorHandle>(key, {
          ...previous,
          ...(body.opaqueLabel !== undefined ? { opaqueLabel: body.opaqueLabel } : {}),
          ...(body.notes !== undefined ? { notes: body.notes } : {}),
        });
      }
      return { previous };
    },
    onError: (_error, _body, context) => {
      if (context?.previous) {
        queryClient.setQueryData<DonorHandle>(key, context.previous);
      }
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<DonorHandle>(key, saved);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ["donor-research", "handles"] });
    },
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
