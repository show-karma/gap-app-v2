"use client";

import type { ReactNode } from "react";
import { ProjectProfileLayout } from "./ProjectProfileLayout";

interface ProjectProfileLayoutWrapperProps {
  projectId: string;
  children: ReactNode;
}

/**
 * Client-side wrapper for ProjectProfileLayout.
 * This is used in the Next.js app layout to provide the shared project profile UI.
 */
export function ProjectProfileLayoutWrapper({
  children,
  projectId,
}: ProjectProfileLayoutWrapperProps) {
  return <ProjectProfileLayout projectId={projectId}>{children}</ProjectProfileLayout>;
}
