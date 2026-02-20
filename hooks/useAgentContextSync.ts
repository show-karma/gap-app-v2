"use client";

import { useParams, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAgentChatStore } from "@/store/agentChat";

/**
 * Syncs the current page context (project, program, or application) to
 * the agent chat store based on the URL pathname and route params.
 *
 * Admin and reviewer routes are unified under /manage/. Access control
 * is enforced by the PermissionProvider in the manage layout — if the
 * user can see the page, they have access.
 */
export function useAgentContextSync() {
  const pathname = usePathname();
  const params = useParams();
  const setAgentContext = useAgentChatStore((s) => s.setAgentContext);

  const programIdParam = params?.programId as string | undefined;
  const cleanProgramId = programIdParam?.includes("_")
    ? programIdParam.split("_")[0]
    : programIdParam;

  useEffect(() => {
    const projectId = params?.projectId as string | undefined;
    const applicationId = params?.applicationId as string | undefined;
    const communityId = params?.communityId as string | undefined;

    // Project pages
    if (pathname?.startsWith("/project/") && projectId) {
      setAgentContext({ projectId });
      return;
    }

    // Unified manage routes (admin + reviewer)
    if (pathname?.includes("/manage/") && communityId) {
      if (applicationId) {
        setAgentContext({ applicationId });
      } else if (cleanProgramId) {
        setAgentContext({ programId: cleanProgramId, communityId });
      } else {
        setAgentContext({ communityId });
      }
      return;
    }

    // No recognized context page — clear context
    setAgentContext(null);
  }, [pathname, params, setAgentContext, cleanProgramId]);
}
