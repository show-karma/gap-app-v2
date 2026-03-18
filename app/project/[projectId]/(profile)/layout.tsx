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
 * Suspense boundary required because ProjectProfileLayout uses useSearchParams(),
 * which needs a Suspense boundary in Next.js App Router production builds.
 */
export default function ProfileLayout({ children }: ProfileLayoutProps) {
  return (
    <Suspense fallback={<ProjectProfileLayoutSkeleton />}>
      <ProjectProfileLayout>{children}</ProjectProfileLayout>
    </Suspense>
  );
}
