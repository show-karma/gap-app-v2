"use client";
import { CommunityImpactCharts } from "@/components/Pages/Communities/Impact/ImpactCharts";

export default function ImpactPage() {
  return (
    <div className="flex flex-col gap-8 pb-20 animate-fade-in-up">
      <CommunityImpactCharts />
    </div>
  );
}
