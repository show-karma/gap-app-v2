"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { ProjectGrantsOverviewLoading } from "@/components/Pages/Project/Loading/Grants/Overview";

const GrantOverview = dynamic(
  () => import("@/components/Pages/Project/Grants/Overview").then((mod) => mod.GrantOverview),
  { loading: () => <ProjectGrantsOverviewLoading /> }
);

/**
 * Grant Overview Page (V2)
 *
 * Displays grant overview content:
 * - Completion summary (if completed)
 * - Grant description
 * - Grant overview card (community, network, tracks, proposal, amount, start date)
 * - Fund usage breakdown (if available)
 */
export default function GrantOverviewPage() {
  return (
    <Suspense fallback={<ProjectGrantsOverviewLoading />}>
      <GrantOverview />
    </Suspense>
  );
}
