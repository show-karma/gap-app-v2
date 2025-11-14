import { usePathname } from "next/navigation"
import React, { useCallback } from "react"
import { cn } from "@/utilities/tailwind"
import { useGrantFormStore } from "./store"

interface StepBlockProps {
  currentStep: number
  title?: string
  children: React.ReactNode
}

export const StepBlock: React.FC<StepBlockProps> = ({
  currentStep,
  title = "Add New Funding",
  children,
}) => {
  const { flowType } = useGrantFormStore()
  const getTotalSteps = useCallback(() => {
    return flowType === "program" ? 3 : 4
  }, [flowType])
  const totalSteps = getTotalSteps()

  // Helper function to get step label based on index and flow type
  const getStepLabel = (index: number) => {
    if (index === 0) return "Type"
    if (index === 1) return "Community"

    if (flowType === "program") {
      // For funding programs (3 steps): Type, Community, Milestones
      if (index === 2) return "Milestones"
    } else {
      // For grants (4 steps): Type, Community, Details, Milestones
      if (index === 2) return "Details"
      if (index === 3) return "Milestones"
    }

    return "" // Fallback
  }

  return (
    <div className="flex w-full flex-col items-center justify-center mb-8 rounded-lg p-3 flex-1">
      <div className="flex w-full flex-col items-center justify-center mb-6 bg-gray-50 dark:bg-zinc-900 rounded-lg p-3">
        <h2 className="text-base font-semibold text-black dark:text-zinc-100 mb-4">{title}</h2>

        <div className="flex items-center justify-between mb-8">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <React.Fragment key={index}>
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8  max-md:w-6  max-md:h-6 rounded-full flex items-center justify-center text-sm font-medium text-white",
                    index + 1 <= currentStep ? "bg-[#738DED]" : "bg-gray-400 dark:bg-zinc-700"
                  )}
                >
                  {index + 1}
                </div>
                <span
                  className={cn(
                    "text-xs mt-1  max-md:text-[10px]",
                    index + 1 <= currentStep
                      ? "text-zinc-800 dark:text-zinc-200"
                      : "text-gray-400 dark:text-zinc-400"
                  )}
                >
                  {getStepLabel(index)}
                </span>
              </div>

              {/* Connector line */}
              {index < totalSteps - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-24 max-md:w-5 mx-2 mb-5",
                    index + 1 < currentStep ? "bg-[#738DED]" : "bg-gray-400 dark:bg-zinc-700"
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="w-full">{children}</div>
    </div>
  )
}
