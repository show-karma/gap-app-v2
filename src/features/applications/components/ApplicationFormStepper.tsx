"use client";

import { cn } from "@/utilities/tailwind";

interface ApplicationFormStepperProps {
  steps: string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function ApplicationFormStepper({
  steps,
  currentStep,
  onStepClick,
}: ApplicationFormStepperProps) {
  const getStepState = (index: number) => {
    if (index < currentStep) return "completed";
    if (index === currentStep) return "active";
    return "upcoming";
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        {steps.map((stepName, index) => {
          const state = getStepState(index);
          return (
            <div key={stepName} className="flex items-center flex-1">
              <button
                className="flex items-center"
                onClick={() => onStepClick?.(index)}
                disabled={!onStepClick || index > currentStep}
                type="button"
              >
                <span
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    state === "active" && "bg-primary text-primary-foreground",
                    state === "completed" && "bg-green-500 text-white",
                    state === "upcoming" &&
                      "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    "ml-2 text-sm font-medium hidden sm:block",
                    state === "active" && "text-foreground",
                    state === "completed" && "text-green-600",
                    state === "upcoming" && "text-zinc-500 dark:text-zinc-400"
                  )}
                >
                  {stepName}
                </span>
              </button>
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2">
                  <div
                    className={cn(
                      "h-full rounded-full transition-colors",
                      index < currentStep ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-700"
                    )}
                    style={{
                      width: index < currentStep ? "100%" : index === currentStep ? "50%" : "0%",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
