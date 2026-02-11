"use client";

import { AlertTriangle } from "lucide-react";
import { useDashboardAdmin } from "@/hooks/useDashboardAdmin";
import { CommunityHealthCard } from "./CommunityHealthCard";
import { CommunityHealthCardSkeleton } from "./CommunityHealthCardSkeleton";

const gridClassName = "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3";

export function AdminSection() {
  const { communities, isLoading, isError, refetch } = useDashboardAdmin();

  if (!isLoading && !isError && communities.length === 0) {
    return null;
  }

  return (
    <section id="admin" className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-foreground">My Communities</h2>

      {isError ? (
        <div className="flex items-center gap-3 rounded-xl border border-border p-6">
          <AlertTriangle className="h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="flex-1 text-sm text-muted-foreground">Unable to load your communities.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <div className={gridClassName}>
          {Array.from({ length: 2 }, (_, index) => (
            <CommunityHealthCardSkeleton key={`community-card-skeleton-${index}`} />
          ))}
        </div>
      ) : (
        <div className={gridClassName}>
          {communities.map((community) => (
            <CommunityHealthCard key={community.uid} community={community} />
          ))}
        </div>
      )}
    </section>
  );
}
