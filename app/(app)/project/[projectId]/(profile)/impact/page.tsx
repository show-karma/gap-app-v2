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
 * Impact page - displays project outputs and outcomes.
 */
export default function ImpactPage() {
  return <ImpactContent />;
}
