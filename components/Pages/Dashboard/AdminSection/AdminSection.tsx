"use client";

import { AlertTriangle, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback } from "react";
import { useDashboardAdmin } from "@/hooks/useDashboardAdmin";
import { CommunityHealthCard } from "./CommunityHealthCard";
import { CommunityHealthCardSkeleton } from "./CommunityHealthCardSkeleton";

const CommunityDialog = dynamic(
  () => import("@/components/Dialogs/CommunityDialog").then((mod) => mod.CommunityDialog),
  { ssr: false }
);

const gridClassName = "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3";

export function AdminSection() {
  const { communities, isLoading, isError, refetch } = useDashboardAdmin();

  const refreshCommunities = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <section id="admin" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">My Communities</h2>
        <CommunityDialog
          buttonElement={{
            text: "Create Community",
            styleClass: "h-9 px-4",
          }}
          refreshCommunities={refreshCommunities}
        />
      </div>

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
      ) : communities.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No communities yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create your first community to get started managing programs and applications.
          </p>
        </div>
      ) : (
        <div className={gridClassName}>
          {communities.map((community) => (
            <CommunityHealthCard key={community.slug} community={community} />
          ))}
        </div>
      )}
    </section>
  );
}
