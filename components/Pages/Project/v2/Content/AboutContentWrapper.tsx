"use client";

import { useParams } from "next/navigation";
import { useProjectProfile } from "@/hooks/v2/useProjectProfile";
import { AboutContent } from "../MainContent/AboutContent";

/**
 * Wrapper component for AboutContent that fetches project data.
 */
export function AboutContentWrapper() {
  const { projectId } = useParams();
  const { project, isLoading } = useProjectProfile(projectId as string);

  if (isLoading || !project) {
    return <div className="animate-pulse text-gray-500">Loading about...</div>;
  }

  return <AboutContent project={project} />;
}
