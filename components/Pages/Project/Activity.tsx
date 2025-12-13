import { Tab } from "@headlessui/react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ActivityList } from "@/components/Shared/ActivityList";
import { useProjectImpacts } from "@/hooks/v2/useProjectImpacts";
import { useProjectUpdates } from "@/hooks/v2/useProjectUpdates";
import { useProjectStore } from "@/store";
import type { UnifiedMilestone } from "@/types/roadmap";
import { cn } from "@/utilities/tailwind";

export const ProjectActivity = () => {
  const { isProjectAdmin } = useProjectStore();
  const { projectId } = useParams();

  // Use dedicated hooks for updates and impacts
  const { milestones = [] } = useProjectUpdates(projectId as string);
  const { impacts = [] } = useProjectImpacts(projectId as string);

  const [selectedTab, setSelectedTab] = useState(0);

  // Convert impacts to match expected format and combine with milestones
  const allUpdates = useMemo(() => {
    const impactItems = impacts.map((impact) => ({
      uid: impact.uid,
      type: "impact" as const,
      title: impact.data?.work || "Impact",
      description: impact.data?.impact,
      createdAt: impact.createdAt || new Date().toISOString(),
      completed: false,
      chainID: 0,
      refUID: impact.refUID,
      source: { type: "impact" },
    }));

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
    { name: "All", count: allUpdates.length },
    { name: "Updates", count: updatesCount },
    { name: "Milestones", count: milestonesCount },
  ];

  // Filter activities based on selected tab - pass everything through milestones prop
  // since allUpdates is actually UnifiedMilestone[]
  const filteredMilestones = useMemo((): UnifiedMilestone[] => {
    switch (selectedTab) {
      case 0: // All
        return allUpdates as UnifiedMilestone[];
      case 1: // Updates only
        return allUpdates.filter(
          (item) =>
            item.type === "activity" || item.type === "grant_update" || item.type === "impact"
        ) as UnifiedMilestone[];
      case 2: // Milestones only
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

      <Tab.Group onChange={setSelectedTab}>
        <Tab.List className="flex space-x-2 rounded-xl bg-blue-50 dark:bg-zinc-800 p-1">
          {tabs.map((tab) => (
            <Tab
              key={tab.name}
              className={({ selected }) =>
                cn(
                  "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                  "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                  selected
                    ? "bg-white dark:bg-zinc-700 shadow text-blue-700 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-400 hover:bg-white/[0.12] hover:text-gray-800 dark:hover:text-white"
                )
              }
            >
              {tab.name} {tab.count > 0 && `(${tab.count})`}
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="mt-2">
          {tabs.map((_tab, idx) => (
            <Tab.Panel
              key={idx}
              className={cn(
                "rounded-xl p-3",
                "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none"
              )}
            >
              <ActivityList milestones={filteredMilestones} isAuthorized={isAuthorized} />
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};
