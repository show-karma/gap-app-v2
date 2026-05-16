"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  type HermesSkillInstallResult,
  type HermesSkillSummary,
  hermesClient,
  type TeamRole,
} from "@/lib/hermes-client";

const skillKeys = {
  all: ["hermes-skills"] as const,
  available: (slug: string) => [...skillKeys.all, "available", slug] as const,
  profile: (slug: string, role: TeamRole) => [...skillKeys.all, "profile", slug, role] as const,
};

export function useAvailableSkills(slug: string | undefined) {
  return useQuery<HermesSkillSummary[]>({
    queryKey: skillKeys.available(slug ?? "anon"),
    enabled: Boolean(slug),
    queryFn: () => hermesClient.listAvailableSkills(slug as string),
  });
}

export function useProfileSkills(slug: string | undefined, role: TeamRole) {
  return useQuery<HermesSkillSummary[]>({
    queryKey: skillKeys.profile(slug ?? "anon", role),
    enabled: Boolean(slug),
    queryFn: () => hermesClient.listProfileSkills(slug as string, role),
  });
}

export function useInstallSkill(slug: string, role: TeamRole) {
  const qc = useQueryClient();
  return useMutation<HermesSkillInstallResult, Error, string>({
    mutationFn: (skillId) => hermesClient.installProfileSkill(slug, role, skillId),
    onSuccess: (result) => {
      if (result.installed) {
        toast.success(`Installed ${result.skill?.name ?? "skill"}`);
      } else {
        toast(`${result.skill?.name ?? "Skill"} already installed`);
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Install failed");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: skillKeys.profile(slug, role) }),
  });
}

export function useUninstallSkill(slug: string, role: TeamRole) {
  const qc = useQueryClient();
  return useMutation<
    { removed: boolean; id: string },
    Error,
    { namespace: string; skillId: string }
  >({
    mutationFn: ({ namespace, skillId }) =>
      hermesClient.uninstallProfileSkill(slug, role, namespace, skillId),
    onMutate: async ({ namespace, skillId }) => {
      await qc.cancelQueries({ queryKey: skillKeys.profile(slug, role) });
      const previous = qc.getQueryData<HermesSkillSummary[]>(skillKeys.profile(slug, role));
      qc.setQueryData<HermesSkillSummary[]>(skillKeys.profile(slug, role), (current) =>
        (current ?? []).filter((s) => s.id !== `${namespace}/${skillId}`)
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      const previous = (ctx as { previous?: HermesSkillSummary[] } | undefined)?.previous;
      if (previous !== undefined) {
        qc.setQueryData(skillKeys.profile(slug, role), previous);
      }
      toast.error(err instanceof Error ? err.message : "Uninstall failed");
    },
    onSuccess: () => toast.success("Skill removed"),
    onSettled: () => qc.invalidateQueries({ queryKey: skillKeys.profile(slug, role) }),
  });
}
