import {
  InformationCircleIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";

import * as Tooltip from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils/cn";
import { ReactNode } from "react";

interface InfoTooltipProps {
  content: ReactNode;
  children?: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  triggerAsChild?: boolean;
  className?: string;
  contentClassName?: string;
  arrowClassName?: string;
}

export const InfoTooltip = ({
  content,
  children,
  side = "bottom",
  align = "center",
  delayDuration = 0,
  triggerAsChild = false,
  className,
  contentClassName,
  arrowClassName,
}: InfoTooltipProps) => {
  const defaultTrigger = (
    <div
      className={cn(
        "rounded-full p-1 hover:bg-gray-100 dark:hover:bg-zinc-800",
        className
      )}
      aria-label="More information"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-info w-4 h-4 text-gray-500"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    </div>
  );

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
            <Tooltip.Arrow
              className={cn("fill-white dark:fill-zinc-800", arrowClassName)}
            />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};
