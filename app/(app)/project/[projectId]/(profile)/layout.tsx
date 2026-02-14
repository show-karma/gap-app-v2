"use client";

import type { ReactNode } from "react";
import { LazyDialogs } from "@/components/Dialogs/LazyDialogs";
import { ProjectProfileLayout } from "@/components/Pages/Project/v2/Layout/ProjectProfileLayout";
import { PermissionsProvider } from "@/components/Utilities/PermissionsProvider";

interface ProfileLayoutProps {
  children: ReactNode;
}

/**
 * Shared layout for the main project profile pages (updates, about, funding, impact, team).
 * This layout provides the consistent header, sidebar, and tab navigation.
 */
export default function ProfileLayout({ children }: ProfileLayoutProps) {
  return (
    <>
      <PermissionsProvider />
      <LazyDialogs />
      <ProjectProfileLayout>{children}</ProjectProfileLayout>
    </>
  );
}
