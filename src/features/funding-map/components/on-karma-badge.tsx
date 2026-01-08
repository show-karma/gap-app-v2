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
          d="M16.1734 11.9959C17.9799 10.5285 19.4455 8.91192 20.5533 7.17098C22.0189 4.85803 22.7603 2.4456 22.7603 0H20.2039C20.2039 1.98135 19.5904 3.9544 18.3718 5.86943C17.3322 7.50259 15.8495 9.07772 14.0601 10.4622C13.3869 10.0228 12.6967 9.60829 11.9894 9.22694C15.7899 6.59896 17.8691 3.33264 17.8691 0H15.3127C15.3127 2.56995 13.421 5.28083 10.1318 7.45285C9.86762 7.62694 9.58642 7.80104 9.31374 7.96684C8.76838 7.743 8.22302 7.53575 7.66913 7.35337V0.00829016H5.11276V6.62383C4.26063 6.42487 3.39998 6.27565 2.55638 6.16788V0.00829016H0V6.00207V8.48912C1.98545 8.48912 4.09021 8.83731 6.17791 9.47565C4.08168 10.2881 1.90876 10.744 0 10.744V13.2311C1.90876 13.2311 4.07316 13.6953 6.17791 14.4995C4.09873 15.1378 1.99398 15.486 0 15.486V17.9731V23.9917H2.55638V17.8321C3.39998 17.7326 4.26063 17.5751 5.11276 17.3762V23.9917H7.66913V16.6466C8.22302 16.456 8.76838 16.257 9.31374 16.0332C9.59494 16.199 9.86762 16.3648 10.1318 16.5472C13.421 18.7109 15.3127 21.4301 15.3127 24H17.8691C17.8691 20.6674 15.7814 17.401 11.9894 14.7731C12.6967 14.3917 13.3869 13.9772 14.0601 13.5378C15.8495 14.914 17.3408 16.4974 18.3718 18.1306C19.5819 20.0456 20.2039 22.0187 20.2039 24H22.7603C22.7603 21.5544 22.0189 19.142 20.5533 16.829C19.454 15.0798 17.9799 13.4632 16.1734 11.9959ZM6.56137 11.9959C7.54984 11.6477 8.52126 11.2249 9.4586 10.744C10.2596 11.1171 11.0436 11.5399 11.8105 11.9959C11.0521 12.4518 10.2681 12.8746 9.4586 13.2477C8.52126 12.7668 7.54132 12.3523 6.56137 11.9959Z"
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
