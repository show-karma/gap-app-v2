"use client";
import { CommunityImpactCharts } from "@/components/Pages/Communities/Impact/ImpactCharts";
import { CommunityImpactAggregateCharts } from "@/components/Pages/Communities/Impact/ImpactAggregateCharts";
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
