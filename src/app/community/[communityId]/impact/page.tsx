"use client";
import { CommunityImpactAggregateCharts } from "@/features/communities/components/impact/ImpactAggregateCharts";
import { CommunityImpactCharts } from "@/features/communities/components/impact/ImpactCharts";
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
