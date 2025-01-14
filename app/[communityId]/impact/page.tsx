import { CommunityImpactCharts } from "@/components/Pages/Communities/Impact/Charts";
import { CommunityImpactFilterRow } from "@/components/Pages/Communities/Impact/FilterRow";
import { CommunityImpactStatCards } from "@/components/Pages/Communities/Impact/StatCards";

export default function ImpactPage() {
  return (
    <div className="flex flex-col gap-5">
      <CommunityImpactStatCards />
      <CommunityImpactFilterRow />
      <CommunityImpactCharts />
    </div>
  );
}
