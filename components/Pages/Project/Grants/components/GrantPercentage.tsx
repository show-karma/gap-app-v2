import type { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types"
import { useMemo } from "react"
import { formatPercentage } from "@/utilities/formatNumber"

type TProps = {
  // TODO: this should be refactored in the source components to pass Grant only
  grant: IGrantResponse
  className?: string
}

export const GrantPercentage: React.FC<TProps> = ({ grant, className }) => {
  const percentage = useMemo(() => {
    if (grant.updates && grant.updates.length > 0) {
      const sortedUpdates = [...grant.updates].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      for (const update of sortedUpdates) {
        if (update.data.completionPercentage) {
          const manualPercentage = Number(update.data.completionPercentage)
          if (!isNaN(manualPercentage)) {
            return formatPercentage(manualPercentage)
          }
        }
      }
    }

    const milestones = grant.milestones

    if (milestones && milestones.length > 0) {
      const total = milestones.length
      const completedMilestones = milestones.filter((milestone) => milestone.completed).length

      return formatPercentage((completedMilestones / total) * 100) || 0
    }

    return 0
  }, [grant])

  if (percentage === 0) {
    return null
  }

  return (
    <div className="flex h-max w-max items-center justify-start rounded-full bg-teal-50 dark:bg-teal-700 text-teal-600 dark:text-teal-200 px-3 py-1 max-2xl:px-2">
      <span className={className}>{percentage}% complete</span>
    </div>
  )
}
