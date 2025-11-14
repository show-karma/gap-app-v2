import type { FC, ReactNode } from "react"

interface MetricCardProps {
  title: string
  value: string | number
  icon: ReactNode
  tooltip?: string
  className?: string
}

export const MetricCard: FC<MetricCardProps> = ({
  title,
  value,
  icon,
  tooltip,
  className = "",
}) => {
  return (
    <div
      className={`z-0 group relative flex flex-col gap-2 rounded-lg border border-gray-200 p-4 ${className}`}
      title={tooltip}
    >
      <div className="flex items-center gap-2">
        <span className="text-gray-500">{icon}</span>
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {tooltip && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full hidden group-hover:block bg-gray-900 text-white text-sm rounded-md py-1 px-2 whitespace-nowrap z-0">
          {tooltip}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  )
}
