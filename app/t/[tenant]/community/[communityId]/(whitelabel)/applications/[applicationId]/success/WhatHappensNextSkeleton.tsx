export function WhatHappensNextSkeleton() {
  return (
    <div className="rounded-lg bg-muted p-6">
      <div className="h-6 w-48 animate-pulse rounded bg-muted-foreground/20 mb-4" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="h-4 w-4 flex-shrink-0 mt-1 rounded-full animate-pulse bg-muted-foreground/20" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted-foreground/20" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted-foreground/20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
