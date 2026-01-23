"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { ProjectOverviewLoading } from "@/components/Pages/Project/Loading/Overview";

const ProjectProfileLayout = dynamic(
  () =>
    import("@/components/Pages/Project/v2/Layout/ProjectProfileLayout").then(
      (mod) => mod.ProjectProfileLayout
    ),
  {
    loading: () => <ProjectOverviewLoading />,
  }
);

interface ProfileLayoutProps {
  children: ReactNode;
}

/**
 * Shared layout for the main project profile pages (updates, about, funding, impact, team).
 * This layout provides the consistent header, sidebar, and tab navigation.
 */
export default function ProfileLayout({ children }: ProfileLayoutProps) {
  return <ProjectProfileLayout>{children}</ProjectProfileLayout>;
}
