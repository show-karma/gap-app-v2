"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/utilities/tailwind";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        {Icon && (
          <div className="mb-4 p-3 rounded-full bg-muted">
            <Icon className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {description && (
          <p className={cn("text-sm text-muted-foreground mb-6 max-w-sm")}>{description}</p>
        )}
        {action && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            asChild={!!action.href}
            onClick={action.onClick}
          >
            {action.href ? <Link href={action.href}>{action.label}</Link> : action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
