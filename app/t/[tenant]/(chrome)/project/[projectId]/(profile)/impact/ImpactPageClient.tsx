"use client";

import dynamic from "next/dynamic";
import { ImpactContentSkeleton } from "@/components/Pages/Project/v2/Skeletons";

const ImpactContent = dynamic(
  () =>
    import("@/components/Pages/Project/v2/MainContent/ImpactContent").then(
      (mod) => mod.ImpactContent
    ),
  {
    loading: () => <ImpactContentSkeleton />,
  }
);

/**
 * Client-side impact content wrapper.
 */
export function ImpactPageClient() {
  return <ImpactContent />;
}
