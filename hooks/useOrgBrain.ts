"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  type BrandData,
  hermesClient,
  type MissionData,
  type OrgBrainResponse,
  type OrgBrainTopic,
} from "@/lib/hermes-client";

const brainKeys = {
  all: ["org-brain"] as const,
  topic: (slug: string, topic: OrgBrainTopic) =>
    [...brainKeys.all, slug, topic] as const,
};

export function useOrgBrain<TData = Record<string, unknown>>(
  slug: string | undefined,
  topic: OrgBrainTopic
) {
  return useQuery<OrgBrainResponse<TData>>({
    queryKey: brainKeys.topic(slug ?? "anon", topic),
    enabled: Boolean(slug),
    queryFn: () => hermesClient.getOrgBrain<TData>(slug as string, topic),
  });
}

export function useUpdateMission(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MissionData) =>
      hermesClient.putOrgBrain(slug, "mission", payload),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: brainKeys.topic(slug, "mission") });
      const previous = qc.getQueryData<OrgBrainResponse<MissionData>>(
        brainKeys.topic(slug, "mission")
      );
      qc.setQueryData<OrgBrainResponse<MissionData>>(
        brainKeys.topic(slug, "mission"),
        { topic: "mission", exists: true, data: payload }
      );
      return { previous };
    },
    onError: (err, _payload, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(brainKeys.topic(slug, "mission"), ctx.previous);
      }
      toast.error(err instanceof Error ? err.message : "Could not save");
    },
    onSuccess: () => toast.success("Mission saved"),
    onSettled: () =>
      qc.invalidateQueries({ queryKey: brainKeys.topic(slug, "mission") }),
  });
}

export function useUpdateBrand(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BrandData) =>
      hermesClient.putOrgBrain(slug, "brand", payload),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: brainKeys.topic(slug, "brand") });
      const previous = qc.getQueryData<OrgBrainResponse<BrandData>>(
        brainKeys.topic(slug, "brand")
      );
      qc.setQueryData<OrgBrainResponse<BrandData>>(
        brainKeys.topic(slug, "brand"),
        { topic: "brand", exists: true, data: payload }
      );
      return { previous };
    },
    onError: (err, _payload, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(brainKeys.topic(slug, "brand"), ctx.previous);
      }
      toast.error(err instanceof Error ? err.message : "Could not save");
    },
    onSuccess: () => toast.success("Brand saved"),
    onSettled: () =>
      qc.invalidateQueries({ queryKey: brainKeys.topic(slug, "brand") }),
  });
}
