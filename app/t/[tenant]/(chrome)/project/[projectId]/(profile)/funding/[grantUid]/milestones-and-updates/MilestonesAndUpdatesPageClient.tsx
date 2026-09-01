"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { ProjectGrantsMilestonesAndUpdatesLoading } from "@/components/Pages/Project/Loading/Grants/MilestonesAndUpdate";

const MilestonesAndUpdates = dynamic(
  () => import("@/components/Pages/Grants/MilestonesAndUpdates"),
  { loading: () => <ProjectGrantsMilestonesAndUpdatesLoading /> }
);

/**
 * Client-side milestones and updates content.
 */
export function MilestonesAndUpdatesPageClient() {
  return (
    <Suspense fallback={<ProjectGrantsMilestonesAndUpdatesLoading />}>
      <MilestonesAndUpdates />
    </Suspense>
  );
}
