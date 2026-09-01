"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { ProjectGrantsOverviewLoading } from "@/components/Pages/Project/Loading/Grants/Overview";

const GrantOverview = dynamic(
  () => import("@/components/Pages/Project/Grants/Overview").then((mod) => mod.GrantOverview),
  { loading: () => <ProjectGrantsOverviewLoading /> }
);

/**
 * Client-side grant overview content.
 */
export function GrantOverviewPageClient() {
  return (
    <Suspense fallback={<ProjectGrantsOverviewLoading />}>
      <GrantOverview />
    </Suspense>
  );
}
