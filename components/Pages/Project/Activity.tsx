import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ActivityList } from "@/components/Shared/ActivityList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectImpacts } from "@/hooks/v2/useProjectImpacts";
import { useProjectUpdates } from "@/hooks/v2/useProjectUpdates";
import { transformImpactsToMilestones } from "@/services/project-profile.service";
import { useProjectStore } from "@/store/project";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { cn } from "@/utilities/tailwind";

type TabValue = "all" | "updates" | "milestones";

export const ProjectActivity = () => {
  const { isProjectAdmin } = useProjectStore();
  const { projectId } = useParams();

  // Use dedicated hooks for updates and impacts
  const { milestones = [] } = useProjectUpdates(projectId as string);
  const { impacts = [] } = useProjectImpacts(projectId as string);

  const [selectedTab, setSelectedTab] = useState<TabValue>("all");

  // Convert impacts to match expected format and combine with milestones
  const allUpdates = useMemo(() => {
    const impactItems = transformImpactsToMilestones(impacts);
    return [...milestones, ...impactItems];
  }, [milestones, impacts]);
  const isAuthorized = isProjectAdmin;

  // Count items by type for tabs
  const updatesCount = useMemo(
    () =>
      allUpdates.filter(
        (item) => item.type === "activity" || item.type === "grant_update" || item.type === "impact"
      ).length,
    [allUpdates]
  );

  const milestonesCount = useMemo(
    () =>
      allUpdates.filter(
        (item) => item.type === "milestone" || item.type === "grant" || item.type === "project"
      ).length,
    [allUpdates]
  );

  // Tabs for filtering different activity types
  const tabs = [
    { name: "All", value: "all" as TabValue, count: allUpdates.length },
    { name: "Updates", value: "updates" as TabValue, count: updatesCount },
    { name: "Milestones", value: "milestones" as TabValue, count: milestonesCount },
  ];

  // Filter activities based on selected tab
  const filteredMilestones = useMemo((): UnifiedMilestone[] => {
    switch (selectedTab) {
      case "all":
        return allUpdates as UnifiedMilestone[];
      case "updates":
        return allUpdates.filter(
          (item) =>
            item.type === "activity" || item.type === "grant_update" || item.type === "impact"
        ) as UnifiedMilestone[];
      case "milestones":
        return allUpdates.filter(
          (item) => item.type === "milestone" || item.type === "grant" || item.type === "project"
        ) as UnifiedMilestone[];
      default:
        return allUpdates as UnifiedMilestone[];
    }
  }, [selectedTab, allUpdates]);

  return (
    <div className="w-full flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Project Activity</h2>
        <p className="text-gray-500 dark:text-gray-400">
          View all updates and milestones for this project
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as TabValue)}>
        <TabsList className="flex space-x-2 rounded-xl bg-blue-50 dark:bg-zinc-800 p-1 h-auto">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                "text-gray-700 dark:text-gray-400 hover:bg-white/[0.12] hover:text-gray-800 dark:hover:text-white",
                "data-[state=active]:bg-white data-[state=active]:dark:bg-zinc-700 data-[state=active]:shadow data-[state=active]:text-blue-700 data-[state=active]:dark:text-blue-300"
              )}
            >
              {tab.name} {tab.count > 0 && `(${tab.count})`}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className={cn(
              "rounded-xl p-3",
              "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none"
            )}
          >
            <ActivityList milestones={filteredMilestones} isAuthorized={isAuthorized} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
