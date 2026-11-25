"use client";

import { InformationCircleIcon, MinusCircleIcon } from "@heroicons/react/24/outline";
import type { FC, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/utilities/tailwind";

export const InsightsSection: FC<{
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}> = ({ title, meta, action, children, className }) => (
  <section aria-label={title} className={cn("flex flex-col gap-4", className)}>
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
        {title}
      </h4>
      {meta ? <span className="text-xs text-gray-500 dark:text-gray-400">{meta}</span> : null}
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
    {children}
  </section>
);

export const InsightsEmpty: FC<{ title: string; description: string; action?: ReactNode }> = ({
  title,
  description,
  action,
}) => (
  <div className="flex items-start gap-3 rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-3.5 dark:border-zinc-600 dark:bg-zinc-900/40">
    <MinusCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{title}</p>
      <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">{description}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  </div>
);

type Tone = "green" | "yellow" | "red" | "gray" | "blue";

const TONE_CLASSES: Record<Tone, string> = {
  green: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  yellow: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  red: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  gray: "bg-gray-100 text-gray-700 dark:bg-zinc-700 dark:text-gray-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

export const StatusPill: FC<{ tone: Tone; children: ReactNode }> = ({ tone, children }) => (
  <span
    className={cn(
      "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
      TONE_CLASSES[tone]
    )}
  >
    {children}
  </span>
);

export const InfoHint: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`About ${label}`}
          className="h-4 w-4 text-gray-400 hover:bg-transparent hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <InformationCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
