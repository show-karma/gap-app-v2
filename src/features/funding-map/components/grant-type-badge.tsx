import type { VariantProps } from "class-variance-authority";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/utilities/tailwind";
import { getGrantTypeConfig } from "../utils/grant-type-config";

interface GrantTypeBadgeProps {
  type: string;
  showLabel?: boolean;
  variant?: VariantProps<typeof badgeVariants>["variant"];
  iconSize?: "xs" | "sm" | "md" | "lg";
  strokeWidth?: number;
  asBadge?: boolean;
  className?: string;
}

/**
 * Displays a single grant type with its icon and optional label.
 * Can be rendered as a badge or as plain content (for dropdowns/filters).
 */
export function GrantTypeBadge({
  type,
  showLabel = true,
  variant = "secondary",
  iconSize = "xs",
  strokeWidth = 2,
  asBadge = true,
  className,
}: GrantTypeBadgeProps) {
  const config = getGrantTypeConfig(type, { iconSize, strokeWidth });

  if (!config) return null;

  const content = (
    <>
      {config.icon}
      {showLabel && <span>{type}</span>}
    </>
  );

  if (!asBadge) {
    // For filter dropdowns or non-badge contexts
    return <div className={cn("flex items-center gap-2", className)}>{content}</div>;
  }

  // For badge display in cards/dialogs
  const badge = (
    <Badge
      variant={variant}
      className={cn(
        "flex items-center gap-1.5 rounded-lg bg-white dark:bg-zinc-950 py-1 font-medium hover:bg-white dark:hover:bg-zinc-950",
        className
      )}
    >
      {content}
    </Badge>
  );

  // Show tooltip only when label is hidden (icon-only mode)
  if (!showLabel) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p>{type}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
