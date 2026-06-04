interface DonorResearchLoadingProps {
  /** Optional human-readable status label rendered below the skeleton. */
  label?: string;
}

/**
 * Shared skeleton used by every donor-research route's `loading.tsx`.
 * Renders a deliberately quiet placeholder so the route shell hydrates
 * without flashing — the data hooks downstream replace it with the real
 * content (or the three-state empty / error variants).
 */
export function DonorResearchLoading({ label = "Loading…" }: DonorResearchLoadingProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex flex-col gap-6">
        <div className="h-8 w-1/3 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {label}
        </p>
      </div>
    </div>
  );
}
