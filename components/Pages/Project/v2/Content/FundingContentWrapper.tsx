"use client";

import { useProjectStore } from "@/store/project";
import { FundingContent } from "../FundingPage/FundingContent";
import { FundingContentSkeleton } from "../Skeletons";

/**
 * Wrapper component for FundingContent that reads project from the Zustand store.
 * The layout already fetches the project, so no additional query is needed here.
 */
export function FundingContentWrapper() {
  const project = useProjectStore((state) => state.project);

  if (!project) {
    return <FundingContentSkeleton />;
  }

  return <FundingContent project={project} />;
}
