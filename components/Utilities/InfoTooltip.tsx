import { InformationCircleIcon } from "@heroicons/react/24/solid";

import * as Tooltip from "@radix-ui/react-tooltip";
import { cn } from "@/utilities/tailwind";
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
    <button
      type="button"
      className={cn(
        "rounded-full p-1 hover:bg-gray-100 dark:hover:bg-zinc-800",
        className
      )}
      aria-label="More information"
    >
      <InformationCircleIcon className="h-4 w-4 text-gray-500" />
    </button>
  );

  return (
    <Tooltip.Provider>
      <Tooltip.Root delayDuration={delayDuration}>
        <Tooltip.Trigger asChild={triggerAsChild}>
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
