"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  type AIAgentMyOrg,
  type AIAgentOrgResponse,
  aiAgentClient,
  type ProvisionOrgInput,
  type TeamRole,
  type UpdateAboutInput,
} from "@/lib/ai-agent-client";
import { useAuth } from "./useAuth";

// Query key factory — single source of truth for cache identity and
// invalidation across hooks. Matches the existing pattern in this codebase
// (see hooks/communities/* for the convention).
const teamKeys = {
  all: ["team"] as const,
  myOrgs: () => [...teamKeys.all, "mine"] as const,
  org: (slug: string) => [...teamKeys.all, "org", slug] as const,
  about: (slug: string, role: TeamRole) => [...teamKeys.all, "about", slug, role] as const,
};

// Lists every org the signed-in user is a member of. Used by the avatar
// dropdown and the onboarding page to route the user to their existing
// team instead of re-running the provisioning form.
export function useMyOrgs() {
  const { authenticated, ready } = useAuth();
  return useQuery<AIAgentMyOrg[]>({
    queryKey: teamKeys.myOrgs(),
    enabled: ready && authenticated,
    queryFn: () => aiAgentClient.getMyOrgs(),
  });
}

export function useTeamOrg(slug: string | undefined) {
  return useQuery<AIAgentOrgResponse>({
    queryKey: slug ? teamKeys.org(slug) : teamKeys.all,
    enabled: !!slug,
    queryFn: () => {
      if (!slug) throw new Error("slug required");
      return aiAgentClient.getOrg(slug);
    },
  });
}

export function useTeamMemberAbout(slug: string | undefined, role: TeamRole) {
  return useQuery<string>({
    queryKey: slug ? teamKeys.about(slug, role) : teamKeys.all,
    enabled: !!slug,
    queryFn: () => {
      if (!slug) throw new Error("slug required");
      return aiAgentClient.getAbout(slug, role);
    },
  });
}

// Optimistic update for the About editor. Replaces the cached "About" text
// immediately so the editor doesn't flash empty on save; rolls back on
// error and toasts the underlying failure.
export function useUpdateTeamMemberAbout(slug: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<UpdateAboutInput, "slug">) =>
      aiAgentClient.updateAbout({ ...input, slug }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: teamKeys.about(slug, input.role) });
      const previous = qc.getQueryData<string>(teamKeys.about(slug, input.role));
      qc.setQueryData(teamKeys.about(slug, input.role), input.content);
      return { previous, role: input.role };
    },
    onError: (err, _input, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(teamKeys.about(slug, ctx.role), ctx.previous);
      }
      toast.error(err instanceof Error ? err.message : "Could not save changes");
    },
    onSuccess: () => {
      toast.success("Saved");
    },
    onSettled: (_data, _err, input) => {
      qc.invalidateQueries({ queryKey: teamKeys.about(slug, input.role) });
    },
  });
}

export function useProvisionOrg() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: ProvisionOrgInput) => aiAgentClient.provision(input),
    onSuccess: (org) => {
      qc.setQueryData(teamKeys.org(org.slug), org);
      qc.invalidateQueries({ queryKey: teamKeys.all });
      toast.success("Team is provisioned");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Provisioning failed");
    },
  });
}
