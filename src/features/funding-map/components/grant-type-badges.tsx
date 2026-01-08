import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/utilities/tailwind";
import { GrantTypeBadge } from "./grant-type-badge";

interface GrantTypeBadgesProps {
  types: string[];
  showLabels?: boolean | "conditional";
  variant?: VariantProps<typeof badgeVariants>["variant"];
  iconSize?: "xs" | "sm" | "md" | "lg";
  strokeWidth?: number;
  className?: string;
}

/**
 * Displays multiple grant type badges with optional conditional label display.
 * When showLabels is 'conditional', labels are only shown if there's a single type.
 */
export function GrantTypeBadges({
  types,
  showLabels = true,
  variant = "secondary",
  iconSize = "xs",
  strokeWidth = 2,
  className,
}: GrantTypeBadgesProps) {
  const shouldShowLabel = showLabels === "conditional" ? types.length === 1 : showLabels;

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {types
        .filter((type): type is string => typeof type === "string")
        .map((type) => (
          <GrantTypeBadge
            key={type}
            type={type}
            showLabel={shouldShowLabel}
            variant={variant}
            iconSize={iconSize}
            strokeWidth={strokeWidth}
          />
        ))}
    </div>
  );
}
