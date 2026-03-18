"use client";

import { type ReactNode, Suspense } from "react";
import { ProjectProfileLayout } from "@/components/Pages/Project/v2/Layout/ProjectProfileLayout";
import { ProjectProfileLayoutSkeleton } from "@/components/Pages/Project/v2/Skeletons";

interface ProfileLayoutProps {
  children: ReactNode;
}

/**
 * Shared layout for the main project profile pages (updates, about, funding, impact, team).
 *
 * No dynamic() here — ProjectProfileLayout is the primary layout for this route
 * and must be in the initial bundle. Code-splitting it causes an extra loading
 * flash (Suspense fallback while chunk loads → layout renders with cached data).
 *
 * The Suspense boundary is required because ProjectProfileLayout uses
 * useSearchParams(), which needs a Suspense boundary in Next.js production builds.
 */
export default function ProfileLayout({ children }: ProfileLayoutProps) {
  return (
    <Suspense fallback={<ProjectProfileLayoutSkeleton />}>
      <ProjectProfileLayout>{children}</ProjectProfileLayout>
    </Suspense>
  );
}
