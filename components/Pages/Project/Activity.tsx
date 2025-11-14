import { Tab } from "@headlessui/react"
import { useParams } from "next/navigation"
import { useState } from "react"
import { ActivityList } from "@/components/Shared/ActivityList"
import { useAllMilestones } from "@/hooks/useAllMilestones"
import { useProjectStore } from "@/store"
import type { UnifiedMilestone } from "@/types/roadmap"
import { cn } from "@/utilities/tailwind"

export const ProjectActivity = () => {
  const { project, isProjectAdmin } = useProjectStore()
  const { projectId } = useParams()
  const { milestones = [] } = useAllMilestones(projectId as string)
  const [selectedTab, setSelectedTab] = useState(0)

  // Combine all types of updates like in the original Updates.tsx
  const getAllUpdates = () => {
    const updates = project?.updates || []
    const grantUpdates: any[] = []
    const grantMilestones: any[] = []
    const impacts = project?.impacts || []

    project?.grants?.forEach((grant) => {
      grantUpdates.push(...(grant.updates || []))
      grantMilestones.push(...(grant.milestones || []))
    })

    return [...updates, ...grantUpdates, ...grantMilestones, ...impacts]
  }

  const allUpdates = getAllUpdates()
  const isAuthorized = isProjectAdmin

  // Tabs for filtering different activity types
  const tabs = [
    { name: "All", count: allUpdates.length + (milestones?.length || 0) },
    { name: "Updates", count: allUpdates.length },
    { name: "Milestones", count: milestones?.length || 0 },
  ]

  // Filter activities based on selected tab
  const getFilteredActivities = () => {
    switch (selectedTab) {
      case 0: // All
        return {
          updates: allUpdates,
          milestones: (milestones as UnifiedMilestone[]) || [],
        }
      case 1: // Updates only
        return { updates: allUpdates, milestones: [] }
      case 2: // Milestones only
        return {
          updates: [],
          milestones: (milestones as UnifiedMilestone[]) || [],
        }
      default:
        return {
          updates: allUpdates,
          milestones: (milestones as UnifiedMilestone[]) || [],
        }
    }
  }

  const { updates: filteredUpdates, milestones: filteredMilestones } = getFilteredActivities()

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
              <ActivityList
                updates={filteredUpdates}
                milestones={filteredMilestones}
                isAuthorized={isAuthorized}
              />
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}
