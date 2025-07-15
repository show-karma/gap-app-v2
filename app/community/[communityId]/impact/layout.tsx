import { CommunityImpactFilterRow } from "@/features/communities/components/Impact/FilterRow";
import { ImpactTabNavigator } from "@/features/communities/components/Impact/ImpactTabNavigator";
import { CommunityImpactStatCards } from "@/features/communities/components/Impact/StatCards";

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
