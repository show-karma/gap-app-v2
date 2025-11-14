import * as Tooltip from "@radix-ui/react-tooltip"
import type { ReactNode } from "react"
import { cn } from "@/utilities/tailwind"

interface QuestionTooltipProps {
  content: ReactNode
  children?: ReactNode
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  delayDuration?: number
  triggerAsChild?: boolean
  className?: string
  contentClassName?: string
  arrowClassName?: string
}

export const QuestionTooltip = ({
  content,
  children,
  side = "bottom",
  align = "center",
  delayDuration = 0,
  triggerAsChild = false,
  className,
  contentClassName,
  arrowClassName,
}: QuestionTooltipProps) => {
  const defaultTrigger = (
    <div
      className={cn("rounded-full p-1 hover:bg-gray-100 dark:hover:bg-zinc-800", className)}
      aria-label="More information"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-4 h-4 text-gray-400"
      >
        <path
          fillRule="evenodd"
          d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  )

  return (
    <Tooltip.Provider>
      <Tooltip.Root delayDuration={delayDuration}>
        <Tooltip.Trigger asChild={triggerAsChild} type="button">
          {children || defaultTrigger}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className={cn(
              "max-w-xs rounded-lg bg-white p-2 text-sm text-gray-700 shadow-lg dark:bg-zinc-800 dark:text-gray-300 z-50",
              contentClassName
            )}
            sideOffset={5}
            side={side}
            align={align}
          >
            {content}
            <Tooltip.Arrow className={cn("fill-white dark:fill-zinc-800", arrowClassName)} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
