"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Skeleton } from "@/components/Utilities/Skeleton";

const GrantImpactCriteria = dynamic(
  () => import("@/components/Pages/Grants/ImpactCriteria").then((mod) => mod.GrantImpactCriteria),
  {
    loading: () => (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    ),
  }
);

/**
 * Client-side impact criteria content.
 */
export function ImpactCriteriaPageClient() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      }
    >
      <GrantImpactCriteria />
    </Suspense>
  );
}
