import type { ReactNode } from "react";
import { LazyDialogs } from "@/components/Dialogs/LazyDialogs";
import { ProjectProfileLayout } from "@/components/Pages/Project/v2/Layout/ProjectProfileLayout";
import { PermissionsProvider } from "@/components/Utilities/PermissionsProvider";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

interface ProfileLayoutProps {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}

/**
 * Shared layout for the main project profile pages (updates, about, funding, impact, team).
 * This layout provides the consistent header, sidebar, and tab navigation.
 */
export default async function ProfileLayout({ children, params }: ProfileLayoutProps) {
  const { projectId } = await params;
  const initialProject = await getProjectCachedData(projectId);

  return (
    <>
      <PermissionsProvider />
      <LazyDialogs />
      <ProjectProfileLayout initialProject={initialProject}>{children}</ProjectProfileLayout>
    </>
  );
}
