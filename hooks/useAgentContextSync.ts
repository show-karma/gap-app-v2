"use client";

import { useParams, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAgentChatStore } from "@/store/agentChat";
import { useWhitelabel } from "@/utilities/whitelabel-context";

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
  const { isWhitelabel, communitySlug } = useWhitelabel();

  const projectId = params?.projectId as string | undefined;
  const applicationId = params?.applicationId as string | undefined;
  const communityId = params?.communityId as string | undefined;
  const programIdParam = params?.programId as string | undefined;
  const cleanProgramId = programIdParam?.includes("_")
    ? programIdParam.split("_")[0]
    : programIdParam;

  useEffect(() => {
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

    // Community pages (regular routes like /community/optimism/funding-opportunities)
    if (pathname?.startsWith("/community/") && communityId) {
      setAgentContext({ communityId });
      return;
    }

    // Whitelabel domains (e.g. app.opgrants.io) — community comes from domain config
    if (isWhitelabel && communitySlug) {
      setAgentContext({ communityId: communitySlug });
      return;
    }

    // No recognized context page — clear context
    setAgentContext(null);
  }, [
    pathname,
    projectId,
    applicationId,
    communityId,
    cleanProgramId,
    isWhitelabel,
    communitySlug,
    setAgentContext,
  ]);
}
