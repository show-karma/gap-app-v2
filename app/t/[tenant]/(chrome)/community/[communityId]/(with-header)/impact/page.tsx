"use client";
import { CommunityImpactFilterRow } from "@/components/Pages/Communities/Impact/FilterRow";
import { CommunityImpactCharts } from "@/components/Pages/Communities/Impact/ImpactCharts";

export default function ImpactPage() {
  return (
    <div className="flex flex-col gap-8 pb-20 animate-fade-in-up">
      {/* Rendered here, not in the layout: the sibling /impact/project-discovery
          route does not want it, and having the layout decide meant reading the
          pathname in a client component. */}
      <CommunityImpactFilterRow />
      <CommunityImpactCharts />
    </div>
  );
}
