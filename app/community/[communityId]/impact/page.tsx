"use client";
import { CommunityImpactCharts } from "@/features/communities/components/Impact/ImpactCharts";
import { CommunityImpactAggregateCharts } from "@/features/communities/components/Impact/ImpactAggregateCharts";
import { useSearchParams } from "next/navigation";

export default function ImpactPage() {
  const searchParams = useSearchParams();
  const aggregateView = searchParams.get("aggregate");
  return (
    <div className="flex flex-col gap-5">
      {aggregateView === "true" ? (
        <CommunityImpactAggregateCharts />
      ) : (
        <CommunityImpactCharts />
      )}
    </div>
  );
}
