"use client";

import { useProjectStore } from "@/store/project";
import { AboutContent } from "../MainContent/AboutContent";
import { AboutContentSkeleton } from "../Skeletons";

/**
 * Wrapper component for AboutContent that reads project from the Zustand store.
 * The layout already fetches the project, so no additional query is needed here.
 */
export function AboutContentWrapper() {
  const project = useProjectStore((state) => state.project);

  if (!project) {
    return <AboutContentSkeleton />;
  }

  return <AboutContent project={project} />;
}
