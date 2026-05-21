"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  type AIAgentSkillInstallResult,
  type AIAgentSkillSummary,
  aiAgentClient,
  type TeamRole,
} from "@/lib/ai-agent-client";

const skillKeys = {
  all: ["ai-agent-skills"] as const,
  available: (slug: string) => [...skillKeys.all, "available", slug] as const,
  profile: (slug: string, role: TeamRole) => [...skillKeys.all, "profile", slug, role] as const,
};

export function useAvailableSkills(slug: string | undefined) {
  return useQuery<AIAgentSkillSummary[]>({
    queryKey: skillKeys.available(slug ?? "anon"),
    enabled: Boolean(slug),
    queryFn: () => aiAgentClient.listAvailableSkills(slug as string),
  });
}

export function useProfileSkills(slug: string | undefined, role: TeamRole) {
  return useQuery<AIAgentSkillSummary[]>({
    queryKey: skillKeys.profile(slug ?? "anon", role),
    enabled: Boolean(slug),
    queryFn: () => aiAgentClient.listProfileSkills(slug as string, role),
  });
}

export function useInstallSkill(slug: string, role: TeamRole) {
  const qc = useQueryClient();
  return useMutation<AIAgentSkillInstallResult, Error, string>({
    mutationFn: (skillId) => aiAgentClient.installProfileSkill(slug, role, skillId),
    onMutate: async (skillId) => {
      await qc.cancelQueries({ queryKey: skillKeys.profile(slug, role) });
      const previous = qc.getQueryData<AIAgentSkillSummary[]>(skillKeys.profile(slug, role));
      const available = qc.getQueryData<AIAgentSkillSummary[]>(skillKeys.available(slug));
      const skillMeta = available?.find((s) => s.id === skillId);
      if (skillMeta) {
        qc.setQueryData<AIAgentSkillSummary[]>(skillKeys.profile(slug, role), (current) =>
          current ? [...current, skillMeta] : [skillMeta]
        );
      }
      return { previous };
    },
    onSuccess: (result) => {
      if (result.installed) {
        toast.success(`Installed ${result.skill?.name ?? "skill"}`);
      } else {
        toast(`${result.skill?.name ?? "Skill"} already installed`);
      }
    },
    onError: (err, _vars, ctx) => {
      const previous = (ctx as { previous?: AIAgentSkillSummary[] } | undefined)?.previous;
      if (previous !== undefined) {
        qc.setQueryData(skillKeys.profile(slug, role), previous);
      }
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
      aiAgentClient.uninstallProfileSkill(slug, role, namespace, skillId),
    onMutate: async ({ namespace, skillId }) => {
      await qc.cancelQueries({ queryKey: skillKeys.profile(slug, role) });
      const previous = qc.getQueryData<AIAgentSkillSummary[]>(skillKeys.profile(slug, role));
      qc.setQueryData<AIAgentSkillSummary[]>(skillKeys.profile(slug, role), (current) =>
        (current ?? []).filter((s) => s.id !== `${namespace}/${skillId}`)
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      const previous = (ctx as { previous?: AIAgentSkillSummary[] } | undefined)?.previous;
      if (previous !== undefined) {
        qc.setQueryData(skillKeys.profile(slug, role), previous);
      }
      toast.error(err instanceof Error ? err.message : "Uninstall failed");
    },
    onSuccess: (result) => {
      if (result.removed) {
        toast.success("Skill removed");
      } else {
        toast("Skill was already absent");
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: skillKeys.profile(slug, role) }),
  });
}
