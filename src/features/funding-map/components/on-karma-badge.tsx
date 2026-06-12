import { CheckSquare2Icon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/utilities/tailwind";

interface OnKarmaBadgeProps {
  className?: string;
  showTooltip?: boolean;
}

/**
 * Badge indicating a program is available on Karma platform
 * Used in funding map cards and filters
 */
export function OnKarmaBadge({ className, showTooltip = false }: OnKarmaBadgeProps) {
  const badge = (
    <span
      className={cn(
        "flex items-center gap-1 text-xs bg-emerald-50 text-emerald-500 rounded-full px-2.5 py-1.5 font-medium dark:bg-emerald-900/50 dark:text-emerald-400",
        className
      )}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 23 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="inline-block flex-shrink-0"
      >
        <path
          d="M16.17 12C17.98 10.53 19.45 8.91 20.55 7.17C22.02 4.86 22.76 2.45 22.76 0H20.2C20.2 1.98 19.59 3.95 18.37 5.87C17.33 7.5 15.85 9.08 14.06 10.46C13.39 10.02 12.7 9.61 11.99 9.23C15.79 6.6 17.87 3.33 17.87 0H15.31C15.31 2.57 13.42 5.28 10.13 7.45C9.87 7.63 9.59 7.8 9.31 7.97C8.77 7.74 8.22 7.54 7.67 7.35V0.01H5.11V6.62C4.26 6.42 3.4 6.28 2.56 6.17V0.01H0V6V8.49C1.99 8.49 4.09 8.84 6.18 9.48C4.08 10.29 1.91 10.74 0 10.74V13.23C1.91 13.23 4.07 13.7 6.18 14.5C4.1 15.14 1.99 15.49 0 15.49V17.97V23.99H2.56V17.83C3.4 17.73 4.26 17.58 5.11 17.38V23.99H7.67V16.65C8.22 16.46 8.77 16.26 9.31 16.03C9.59 16.2 9.87 16.36 10.13 16.55C13.42 18.71 15.31 21.43 15.31 24H17.87C17.87 20.67 15.78 17.4 11.99 14.77C12.7 14.39 13.39 13.98 14.06 13.54C15.85 14.91 17.34 16.5 18.37 18.13C19.58 20.05 20.2 22.02 20.2 24H22.76C22.76 21.55 22.02 19.14 20.55 16.83C19.45 15.08 17.98 13.46 16.17 12ZM6.56 12C7.55 11.65 8.52 11.22 9.46 10.74C10.26 11.12 11.04 11.54 11.81 12C11.05 12.45 10.27 12.87 9.46 13.25C8.52 12.77 7.54 12.35 6.56 12Z"
          className="fill-emerald-500 dark:fill-emerald-400"
        />
      </svg>
    </span>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="flex items-center gap-1">
          <CheckSquare2Icon className="h-4 w-4" />
          <p>Apply on Karma</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
