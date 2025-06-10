import { CommunityImpactFilterRow } from "@/components/Pages/Communities/Impact/FilterRow";
import { ImpactTabNavigator } from "@/components/Pages/Communities/Impact/ImpactTabNavigator";
import { CommunityImpactStatCards } from "@/components/Pages/Communities/Impact/StatCards";

export default function ImpactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:px-3 md:px-4 px-6  py-2">
      <ImpactTabNavigator />
      <CommunityImpactFilterRow />
      {children}
    </div>
  );
}
