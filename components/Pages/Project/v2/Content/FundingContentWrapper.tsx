"use client";

import { useParams } from "next/navigation";
import { useProjectProfile } from "@/hooks/v2/useProjectProfile";
import { FundingContent } from "../FundingPage/FundingContent";

/**
 * Wrapper component for FundingContent that fetches project data.
 */
export function FundingContentWrapper() {
  const { projectId } = useParams();
  const { project, isLoading } = useProjectProfile(projectId as string);

  if (isLoading || !project) {
    return <div className="animate-pulse text-gray-500">Loading funding...</div>;
  }

  return <FundingContent project={project} />;
}
