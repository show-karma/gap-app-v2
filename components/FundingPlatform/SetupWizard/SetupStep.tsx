"use client";

import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { Button } from "@/components/Utilities/Button";
import type { SetupStep as SetupStepType } from "@/hooks/useProgramSetupProgress";
import { cn } from "@/utilities/tailwind";

interface SetupStepProps {
  step: SetupStepType;
  stepNumber: number;
  isLast?: boolean;
}

export function SetupStep({ step, stepNumber, isLast = false }: SetupStepProps) {
  const isCompleted = step.status === "completed";
  const isPending = step.status === "pending";
  const isDisabled = step.status === "disabled";

  return (
    <div
      className={cn(
        "relative flex items-start gap-4 p-4 rounded-lg border transition-all",
        isCompleted && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
        isPending &&
          "bg-white dark:bg-zinc-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700",
        isDisabled && "bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-gray-700 opacity-60"
      )}
    >
      {/* Step Number / Status Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm",
          isCompleted && "bg-green-500 text-white",
          isPending && "bg-blue-500 text-white",
          isDisabled && "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
        )}
      >
        {isCompleted ? <CheckCircleIcon className="w-6 h-6" /> : <span>{stepNumber}</span>}
      </div>

      {/* Step Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3
            className={cn(
              "text-base font-semibold",
              isCompleted && "text-green-800 dark:text-green-200",
              isPending && "text-gray-900 dark:text-white",
              isDisabled && "text-gray-500 dark:text-gray-400"
            )}
          >
            {step.title}
          </h3>
          {step.required && !isCompleted && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-medium">
              Required
            </span>
          )}
          {isCompleted && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">
              Completed
            </span>
          )}
        </div>
        <p
          className={cn(
            "text-sm",
            isCompleted && "text-green-700 dark:text-green-300",
            isPending && "text-gray-600 dark:text-gray-400",
            isDisabled && "text-gray-400 dark:text-gray-500"
          )}
        >
          {step.description}
        </p>

        {/* Disabled message */}
        {isDisabled && (
          <div className="flex items-center gap-1 mt-2 text-sm text-amber-600 dark:text-amber-400">
            <ExclamationCircleIcon className="w-4 h-4" />
            <span>Complete previous required steps first</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="flex-shrink-0">
        {isDisabled ? (
          <Button variant="secondary" disabled className="opacity-50 cursor-not-allowed">
            {step.actionLabel}
          </Button>
        ) : isCompleted && step.id === "enable-program" ? (
          <Button
            variant="secondary"
            disabled
            className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700"
          >
            <CheckCircleIcon className="w-4 h-4 mr-1" />
            {step.actionLabel}
          </Button>
        ) : (
          <Link href={step.href}>
            <Button
              variant={isPending && step.required ? "primary" : "secondary"}
              className={cn(
                isPending && step.required && "bg-blue-600 hover:bg-blue-700 text-white"
              )}
            >
              {step.actionLabel}
              {isPending && step.required && <span className="ml-1">&rarr;</span>}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
