"use client";

import { useParams, usePathname } from "next/navigation";
import { useEffect } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAgentChatStore } from "@/store/agentChat";

/**
 * Syncs the current page context (project, program, or application) to
 * the agent chat store based on the URL pathname and route params.
 * Clears context when navigating away from a context-bearing page.
 */
export function useAgentContextSync() {
  const pathname = usePathname();
  const params = useParams();
  const setAgentContext = useAgentChatStore((s) => s.setAgentContext);
  const programIdParam = params?.programId as string | undefined;
  const cleanProgramId =
    programIdParam && programIdParam.includes("_") ? programIdParam.split("_")[0] : programIdParam;

  const isAdminRoute = pathname?.includes("/admin/funding-platform");
  const isReviewerRoute = pathname?.includes("/reviewer/");

  const { hasPermission: canAdminRead, isLoading: isLoadingAdminPerm } = usePermissions({
    programId: cleanProgramId,
    action: "read",
    enabled: Boolean(isAdminRoute && cleanProgramId),
  });

  const { hasPermission: canReviewerRead, isLoading: isLoadingReviewerPerm } = usePermissions({
    programId: cleanProgramId,
    action: "read",
    enabled: Boolean(isReviewerRoute && cleanProgramId),
  });

  useEffect(() => {
    const projectId = params?.projectId as string | undefined;
    const applicationId = params?.applicationId as string | undefined;
    const communityId = params?.communityId as string | undefined;

    if (pathname?.startsWith("/project/") && projectId) {
      setAgentContext({ projectId });
      return;
    }

    if (isAdminRoute && communityId) {
      if (cleanProgramId) {
        // On a specific program page — check program-level permission
        if (isLoadingAdminPerm) return;
        if (!canAdminRead) {
          setAgentContext(null);
          return;
        }
        setAgentContext({ programId: cleanProgramId, communityId });
      } else {
        // On the community programs list page (no programId) — set community hint
        setAgentContext({ communityId });
      }
      return;
    }

    if (isReviewerRoute && applicationId) {
      if (cleanProgramId) {
        if (isLoadingReviewerPerm) return;
        if (!canReviewerRead) {
          setAgentContext(null);
          return;
        }
      }
      setAgentContext({ applicationId });
      return;
    }

    // No recognized context page — clear context
    setAgentContext(null);
  }, [
    pathname,
    params,
    setAgentContext,
    isAdminRoute,
    isReviewerRoute,
    cleanProgramId,
    canAdminRead,
    canReviewerRead,
    isLoadingAdminPerm,
    isLoadingReviewerPerm,
  ]);
}
