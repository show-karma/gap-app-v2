"use client";

import dynamic from "next/dynamic";
import { type ReactNode, Suspense } from "react";
// In E2E builds, skip dynamic() to avoid chunk-loading issues in Cypress.
// The compile-time flag is inlined, so the unused branch is tree-shaken.
import { ProjectProfileLayout as DirectLayout } from "@/components/Pages/Project/v2/Layout/ProjectProfileLayout";
import { ProjectProfileLayoutSkeleton } from "@/components/Pages/Project/v2/Skeletons";

const DynamicLayout = dynamic(
  () =>
    import("@/components/Pages/Project/v2/Layout/ProjectProfileLayout").then(
      (mod) => mod.ProjectProfileLayout
    ),
  {
    loading: () => <ProjectProfileLayoutSkeleton />,
  }
);

const ProjectProfileLayout =
  process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true" ? DirectLayout : DynamicLayout;

interface ProfileLayoutProps {
  children: ReactNode;
}

/**
 * Shared layout for the main project profile pages (updates, about, funding, impact, team).
 * This layout provides the consistent header, sidebar, and tab navigation.
 *
 * Wrapped in Suspense because ProjectProfileLayout uses useSearchParams(),
 * which requires a Suspense boundary in Next.js App Router production builds.
 */
export default function ProfileLayout({ children }: ProfileLayoutProps) {
  return (
    <Suspense fallback={<ProjectProfileLayoutSkeleton />}>
      <ProjectProfileLayout>{children}</ProjectProfileLayout>
    </Suspense>
  );
}
