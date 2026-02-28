"use client";

import { FileText } from "lucide-react";
import type { Application } from "@/types/whitelabel-entities";
import { ApplicationCard } from "./ApplicationCard";

interface ApplicationsListProps {
  applications: Application[];
  communityId: string;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
}

function LoadingSkeleton() {
  const skeletonKeys = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"];
  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      data-testid="loading"
    >
      {skeletonKeys.map((key) => (
        <div
          key={key}
          className="min-h-[200px] animate-pulse rounded-xl border border-border bg-card p-5"
        >
          <div className="space-y-3">
            <div className="h-5 w-3/4 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
          </div>
          <div className="mt-6 h-6 w-24 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function ApplicationsList({
  applications,
  communityId,
  isLoading,
  emptyMessage = "No applications found",
  emptyDescription = "You haven't submitted any applications yet.",
}: ApplicationsListProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">
          {emptyMessage}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      data-testid="applications-grid"
    >
      {applications.map((application) => (
        <ApplicationCard
          key={application.referenceNumber}
          application={application}
          communityId={communityId}
        />
      ))}
    </div>
  );
}
