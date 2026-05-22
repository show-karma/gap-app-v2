/**
 * TanStack Query hooks for the research tray — ported from
 * grant-atlas features/grant-atlas/hooks/use-research-tray.ts.
 *
 * All writes use useMutation with optimistic updates + rollback on error.
 * Query key: ["non-profits-research-tray"]
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { resultToPromise } from "../lib/result-to-promise";
import { type ResearchTrayEntry, researchTrayService } from "../services/research-tray.service";
import type { RankedEntity } from "../types/philanthropy";

export const RESEARCH_TRAY_KEY = ["non-profits-research-tray"] as const;

export function useResearchTray() {
  const { authenticated } = useAuth();

  return useQuery({
    queryKey: [...RESEARCH_TRAY_KEY],
    queryFn: () => resultToPromise(researchTrayService.list()),
    enabled: authenticated,
    staleTime: 60_000,
  });
}

export function useAddToResearchTray() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entity: RankedEntity) =>
      resultToPromise(
        researchTrayService.create({
          entityType: entity.entityType,
          entityId: entity.id,
          name: entity.name ?? undefined,
          metadata: { ...entity } as Record<string, unknown>,
        })
      ),
    onSuccess: (newEntry) => {
      queryClient.setQueriesData<ResearchTrayEntry[]>({ queryKey: RESEARCH_TRAY_KEY }, (old) => {
        if (!old) return [newEntry];
        if (old.some((e) => e.entityId === newEntry.entityId)) return old;
        return [...old, newEntry];
      });
    },
  });
}

export function useRemoveFromResearchTray() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resultToPromise(researchTrayService.deleteOne(id)),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: RESEARCH_TRAY_KEY });
      const previous = queryClient.getQueryData<ResearchTrayEntry[]>(RESEARCH_TRAY_KEY);
      queryClient.setQueriesData<ResearchTrayEntry[]>({ queryKey: RESEARCH_TRAY_KEY }, (old) =>
        old?.filter((e) => e.id !== id)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(RESEARCH_TRAY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: RESEARCH_TRAY_KEY });
    },
  });
}

export function useClearResearchTray() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resultToPromise(researchTrayService.clearAll()),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: RESEARCH_TRAY_KEY });
      const previous = queryClient.getQueryData<ResearchTrayEntry[]>(RESEARCH_TRAY_KEY);
      queryClient.setQueriesData<ResearchTrayEntry[]>({ queryKey: RESEARCH_TRAY_KEY }, () => []);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(RESEARCH_TRAY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: RESEARCH_TRAY_KEY });
    },
  });
}
