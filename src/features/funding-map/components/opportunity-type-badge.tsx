"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/utilities/tailwind";
import type { OpportunityType } from "../types/funding-program";
import { getOpportunityTypeConfig } from "../utils/opportunity-type-config";

interface OpportunityTypeBadgeProps {
  type: OpportunityType;
  className?: string;
}

export function OpportunityTypeBadge({ type, className }: OpportunityTypeBadgeProps) {
  const config = getOpportunityTypeConfig(type);
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
        config.bgClass,
        config.colorClass,
        config.borderClass,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.singularLabel}
    </Badge>
  );
}
