import type { VariantProps } from "class-variance-authority";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import { cn } from "@/utilities/tailwind";
import { OPPORTUNITY_TO_GRANT_TYPE } from "../constants/filter-options";
import type { OpportunityType } from "../types/funding-program";
import { getOpportunityTypeConfig } from "../utils/opportunity-type-config";
import { GrantTypeBadge } from "./grant-type-badge";

interface GrantTypeBadgesProps {
  types: string[];
  showLabels?: boolean | "conditional";
  variant?: VariantProps<typeof badgeVariants>["variant"];
  iconSize?: "xs" | "sm" | "md" | "lg";
  strokeWidth?: number;
  className?: string;
  opportunityType?: OpportunityType;
}

/**
 * Displays multiple grant type badges with optional conditional label display.
 * When showLabels is 'conditional', labels are only shown if there's a single type.
 * When opportunityType is non-grant, prepends an opportunity type badge.
 */

export function GrantTypeBadges({
  types,
  showLabels = true,
  variant = "secondary",
  iconSize = "xs",
  strokeWidth = 2,
  className,
  opportunityType,
}: GrantTypeBadgesProps) {
  const isNonGrant = opportunityType && opportunityType !== "grant";
  const matchingGrantType = opportunityType
    ? OPPORTUNITY_TO_GRANT_TYPE[opportunityType]
    : undefined;
  const hasDuplicateGrantType = matchingGrantType ? types.includes(matchingGrantType) : false;
  const showOpportunityPill = isNonGrant && !hasDuplicateGrantType;
  const totalBadgeCount = types.length + (showOpportunityPill ? 1 : 0);
  const shouldShowLabel = showLabels === "conditional" ? totalBadgeCount === 1 : showLabels;

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {showOpportunityPill && (
        <OpportunityTypePill
          type={opportunityType}
          showLabel={shouldShowLabel}
          variant={variant}
          iconSize={iconSize}
          strokeWidth={strokeWidth}
        />
      )}
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

function OpportunityTypePill({
  type,
  showLabel,
  variant,
  iconSize,
  strokeWidth,
}: {
  type: OpportunityType;
  showLabel: boolean;
  variant?: VariantProps<typeof badgeVariants>["variant"];
  iconSize?: "xs" | "sm" | "md" | "lg";
  strokeWidth?: number;
}) {
  const matchingGrantTypeName = OPPORTUNITY_TO_GRANT_TYPE[type];
  if (matchingGrantTypeName) {
    return (
      <GrantTypeBadge
        type={matchingGrantTypeName}
        showLabel={showLabel}
        variant={variant}
        iconSize={iconSize}
        strokeWidth={strokeWidth}
      />
    );
  }

  const config = getOpportunityTypeConfig(type);
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium",
        config.bgClass,
        config.colorClass,
        config.borderClass
      )}
    >
      <Icon className="h-3 w-3" />
      {showLabel && <span>{config.singularLabel}</span>}
    </Badge>
  );
}
