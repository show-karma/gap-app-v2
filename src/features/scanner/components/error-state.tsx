"use client";

import { AlertTriangle, type LucideIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  readonly title: string;
  readonly message: string;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
  readonly icon?: LucideIcon;
}

// Shared error / empty boundary for the scanner: a soft destructive-tinted
// icon, a title, a sentence of explanation, and an optional retry. Used inline
// (failed scorecard/report) and from the route error.tsx boundaries.
export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel = "Try again",
  icon: Icon = AlertTriangle,
}: ErrorStateProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive-subtle text-destructive">
        <Icon className="h-7 w-7" aria-hidden />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
