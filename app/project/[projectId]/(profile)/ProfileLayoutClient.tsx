"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { ProjectProfileLayoutSkeleton } from "@/components/Pages/Project/v2/Skeletons";

const ProjectProfileLayout = dynamic(
  () =>
    import("@/components/Pages/Project/v2/Layout/ProjectProfileLayout").then(
      (mod) => mod.ProjectProfileLayout
    ),
  {
    loading: () => <ProjectProfileLayoutSkeleton />,
  }
);

interface ProfileLayoutClientProps {
  children: ReactNode;
}

/**
 * Client-side wrapper for the project profile layout.
 * Provides the consistent header, sidebar, and tab navigation.
 */
export function ProfileLayoutClient({ children }: ProfileLayoutClientProps) {
  return <ProjectProfileLayout>{children}</ProjectProfileLayout>;
}
