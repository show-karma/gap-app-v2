import React from "react";
import { cn } from "@/utilities/tailwind";

interface StepBlockProps {
  currentStep: number;
  totalSteps: number;
  title?: string;
  children: React.ReactNode;
  flowType?: "grant" | "program";
}

export const StepBlock: React.FC<StepBlockProps> = ({
  currentStep,
  totalSteps,
  title = "Add New Funding",
  children,
  flowType = "grant",
}) => {
  // For program flow, we only have 3 steps
  const actualTotalSteps = flowType === "program" ? 3 : totalSteps;

  return (
    <div className="flex w-full flex-col items-center justify-center mb-8 rounded-lg p-3 flex-1">
      <div className="flex w-full flex-col items-center justify-center mb-6 bg-gray-50 dark:bg-zinc-900 rounded-lg p-3">
        <h2 className="text-base font-semibold text-black dark:text-zinc-100 mb-4">
          {title}
        </h2>

        <div className="flex items-center justify-between mb-8">
          {Array.from({ length: actualTotalSteps }).map((_, index) => (
            <React.Fragment key={index}>
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white",
                    index + 1 <= currentStep
                      ? "bg-[#738DED]"
                      : "bg-gray-400 dark:bg-zinc-700"
                  )}
                >
                  {index + 1}
                </div>
                <span
                  className={cn(
                    "text-xs mt-1 ",
                    index + 1 <= currentStep
                      ? "text-zinc-800 dark:text-zinc-200"
                      : "text-gray-400 dark:text-zinc-400"
                  )}
                >
                  {index === 0
                    ? "Type"
                    : index === 1
                    ? "Community"
                    : index === 2
                    ? "Details"
                    : "Milestones"}
                </span>
              </div>

              {/* Connector line */}
              {index < actualTotalSteps - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-24 mx-2 mb-5",
                    index + 1 < currentStep
                      ? "bg-[#738DED]"
                      : "bg-gray-400 dark:bg-zinc-700"
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
};
