"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProjectProfileLayoutSkeleton } from "@/components/Pages/Project/v2/Skeletons";
import { useProjectStore } from "@/store/project";

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
  const { projectId } = useParams();
  const project = useProjectStore((state) => state.project);
  const projectName = project?.details?.title || "Project";

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Projects", href: "/projects" },
          { label: projectName, href: `/project/${projectId}` },
        ]}
      />
      <ProjectProfileLayout>{children}</ProjectProfileLayout>
    </>
  );
}
