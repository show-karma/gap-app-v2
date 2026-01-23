"use client";

import dynamic from "next/dynamic";

const ImpactContent = dynamic(
  () =>
    import("@/components/Pages/Project/v2/MainContent/ImpactContent").then(
      (mod) => mod.ImpactContent
    ),
  {
    loading: () => <div className="animate-pulse text-gray-500">Loading impact...</div>,
  }
);

/**
 * Impact page - displays project outputs and outcomes.
 */
export default function ImpactPage() {
  return <ImpactContent />;
}
