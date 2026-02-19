"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useProjectProfile } from "@/hooks/v2/useProjectProfile";
import { AboutContent } from "../MainContent/AboutContent";

/**
 * Wrapper component for AboutContent that fetches project data.
 * Handles smooth scrolling to sections via scrollTo query parameter.
 */
export function AboutContentWrapper() {
  const { projectId } = useParams();
  const searchParams = useSearchParams();
  const { project, isLoading } = useProjectProfile(projectId as string);

  // Handle smooth scroll to section based on query parameter
  useEffect(() => {
    if (!project || isLoading) return;

    const scrollTo = searchParams.get("scrollTo");
    if (scrollTo) {
      // Wait for content to render, then smooth scroll
      const timeoutId = setTimeout(() => {
        const element = document.getElementById(scrollTo);
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 150);

      return () => clearTimeout(timeoutId);
    }
  }, [project, isLoading, searchParams]);

  if (isLoading || !project) {
    return <div className="animate-pulse text-gray-500">Loading about...</div>;
  }

  return <AboutContent project={project} />;
}
