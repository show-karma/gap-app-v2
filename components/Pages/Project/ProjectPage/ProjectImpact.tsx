import pluralize from "pluralize"
import { useProjectImpactIndicators } from "@/hooks/useProjectImpactIndicators"
import formatCurrency from "@/utilities/formatCurrency"

interface ProjectImpactProps {
  projectId: string
  range?: number // Optional range parameter (30, 90, 180, 360)
}

export const ProjectImpact = ({ projectId, range = 30 }: ProjectImpactProps) => {
  const { data: impactData } = useProjectImpactIndicators(projectId, range)

  const hasAnyImpactIndicators =
    impactData?.metrics && Object.values(impactData.metrics).some((metric) => metric.value > 0)

  if (!hasAnyImpactIndicators) {
    return null
  }

  const { metrics } = impactData

  return (
    <div className="flex flex-col gap-2">
      <p className="text-black dark:text-zinc-400 font-bold text-sm">Project Impact</p>
      <div className="flex flex-row  max-lg:flex-col gap-4">
        {metrics.transactions && metrics.transactions.value > 0 && (
          <div className="flex flex-1 rounded border border-[#EAECf0] dark:border-zinc-600 border-l-[#155EEF] dark:border-l-[#155EEF] border-l-[4px] p-4 justify-between items-center">
            <div className="flex flex-col gap-3">
              <p className="text-black dark:text-zinc-300 dark:bg-zinc-800 text-2xl font-bold bg-[#EFF4FF] rounded-lg px-2 py-1 flex justify-center items-center min-h-[40px]  min-w-[40px] w-max h-max">
                {formatCurrency(metrics.transactions.value)}
              </p>
              <div className="flex flex-row gap-3">
                <div className="flex flex-col">
                  <p className="font-normal text-brand-gray text-sm dark:text-zinc-300">
                    {pluralize("Total Transaction", metrics.transactions.value)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">(last {range} days)</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {metrics.gitCommits && metrics.gitCommits.value > 0 && (
          <div className="flex flex-1 rounded border border-[#EAECf0] dark:border-zinc-600 border-l-[#155EEF] dark:border-l-[#155EEF] border-l-[4px] p-4 justify-between items-center">
            <div className="flex flex-col gap-3">
              <p className="text-black dark:text-zinc-300 dark:bg-zinc-800 text-2xl font-bold bg-[#EFF4FF] rounded-lg px-2 py-1 flex justify-center items-center min-h-[40px]  min-w-[40px] w-max h-max">
                {formatCurrency(metrics.gitCommits.value)}
              </p>
              <div className="flex flex-row gap-3">
                <div className="flex flex-col">
                  <p className="font-normal text-brand-gray text-sm dark:text-zinc-300">
                    {pluralize("Git Commit", metrics.gitCommits.value)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">(last {range} days)</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {metrics.uniqueUsers && metrics.uniqueUsers.value > 0 && (
          <div className="flex flex-1 rounded border border-[#EAECf0] dark:border-zinc-600 border-l-[#155EEF] dark:border-l-[#155EEF] border-l-[4px] p-4 justify-between items-center">
            <div className="flex flex-col gap-3">
              <p className="text-black dark:text-zinc-300 dark:bg-zinc-800 text-2xl font-bold bg-[#EFF4FF] rounded-lg px-2 py-1 flex justify-center items-center min-h-[40px]  min-w-[40px] w-max h-max">
                {formatCurrency(metrics.uniqueUsers.value)}
              </p>
              <div className="flex flex-row gap-3">
                <div className="flex flex-col">
                  <p className="font-normal text-brand-gray text-sm dark:text-zinc-300">
                    {pluralize("Unique User", metrics.uniqueUsers.value)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">(last {range} days)</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
