"use client";

import { useQuery } from "@tanstack/react-query";
import type { Hex } from "viem";
import type { DashboardModuleKey } from "@/components/Pages/Dashboard/v3/module";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardAdmin } from "@/hooks/useDashboardAdmin";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import { fetchMyProjects } from "@/utilities/sdk/projects/fetchMyProjects";

export interface ReachableModules {
  /** Modules the user is gated for. Empty until `isResolved`. */
  keys: Set<DashboardModuleKey>;
  isResolved: boolean;
}

/**
 * Which dashboard drill-ins this user can actually open.
 *
 * `/dashboard/[module]` redirects back to the overview for a module the user
 * isn't gated for, so anything offering a drill-in has to know first — linking
 * to one they don't have bounces them straight back with nothing explaining
 * why.
 *
 * Deliberately not `useDashboardModules`: that hook redirects to the home page
 * when the visitor isn't authenticated, which would throw a logged-out user off
 * whatever public page they were reading. This reads the same sources without
 * the side effect, and shares their React Query cache, so opening it after a
 * dashboard visit costs nothing.
 */
export function useReachableModules(enabled: boolean): ReachableModules {
  const { authenticated, address } = useAuth();
  const active = enabled && Boolean(authenticated);

  const projects = useQuery({
    queryKey: ["myProjects", address as Hex | undefined],
    queryFn: () => fetchMyProjects(address as Hex | undefined),
    enabled: active,
    staleTime: 5 * 60 * 1000,
  });

  const { hasPrograms, isLoading: reviewerLoading } = useReviewerPrograms({ enabled: active });
  const { communities, isLoading: adminLoading } = useDashboardAdmin({ enabled: active });

  const keys = new Set<DashboardModuleKey>();
  if ((projects.data?.length ?? 0) > 0) keys.add("projects");
  // Mirrors the dashboard's reviews gate: an assigned reviewer, or an admin
  // with applications waiting on them.
  const hasAdminPending = communities.some((community) => community.pendingApplicationsCount > 0);
  if (hasPrograms || hasAdminPending) keys.add("reviews");

  const isResolved = active
    ? !projects.isLoading && !reviewerLoading && !adminLoading
    : // Nothing to resolve for a logged-out visitor: they have no drill-ins.
      enabled;

  return { keys, isResolved };
}
