"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { ProjectGrantsMilestonesAndUpdatesLoading } from "@/components/Pages/Project/Loading/Grants/MilestonesAndUpdate";

const MilestonesAndUpdates = dynamic(
  () => import("@/components/Pages/Grants/MilestonesAndUpdates"),
  { loading: () => <ProjectGrantsMilestonesAndUpdatesLoading /> }
);

/**
 * Grant Milestones and Updates Page (V2)
 *
 * Displays grant milestones and updates timeline with:
 * - Milestone creation for authorized users
 * - Progress tracking
 * - Update history
 */
export default function MilestonesAndUpdatesPage() {
  return (
    <Suspense fallback={<ProjectGrantsMilestonesAndUpdatesLoading />}>
      <MilestonesAndUpdates />
    </Suspense>
  );
}
