import type { VariantProps } from "class-variance-authority";
import type * as React from "react";

import { badgeVariants } from "@/components/ui/badge.variants";
import { cn } from "@/utilities/tailwind";

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };
