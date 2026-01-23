"use client";

import type { ReactNode } from "react";
import { ProjectProfileLayout } from "./ProjectProfileLayout";

interface ProjectProfileLayoutWrapperProps {
  children: ReactNode;
}

/**
 * Client-side wrapper for ProjectProfileLayout.
 * This is used in the Next.js app layout to provide the shared project profile UI.
 */
export function ProjectProfileLayoutWrapper({ children }: ProjectProfileLayoutWrapperProps) {
  return <ProjectProfileLayout>{children}</ProjectProfileLayout>;
}
