import type React from "react"
import { cn } from "@/utilities/tailwind"

interface FundingPlatformStatsCardProps {
  title: string
  value: number | string
  bgColor: string
  color: string
  icon: React.ReactNode
  titleClassname?: string
  valueClassname?: string
}

export const FundingPlatformStatsCard = ({
  title,
  value,
  bgColor,
  color,
  icon,
  titleClassname,
  valueClassname,
}: FundingPlatformStatsCardProps) => {
  return (
    <div className="border-0 ring-1 ring-gray-200 dark:bg-zinc-900 hover:shadow-md transition-shadow p-6 rounded-md">
      <div className="flex items-center justify-between">
        <div>
          <p className={cn("text-sm font-medium text-gray-600 dark:text-zinc-400", titleClassname)}>
            {title}
          </p>
          <p
            className={cn(
              "text-2xl font-bold text-gray-900 dark:text-zinc-100 mt-1",
              valueClassname
            )}
          >
            {value}
          </p>
        </div>
        <div className={cn("p-3 rounded-full", bgColor)}>
          <div className={color}>{icon}</div>
        </div>
      </div>
    </div>
  )
}
