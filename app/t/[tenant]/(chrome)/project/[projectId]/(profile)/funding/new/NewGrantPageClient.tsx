"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { DefaultLoading } from "@/components/Utilities/DefaultLoading";

const NewGrant = dynamic(
  () =>
    import("@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrant").then(
      (mod) => mod.NewGrant
    ),
  { loading: () => <DefaultLoading /> }
);

/**
 * Client-side new grant form.
 */
export function NewGrantPageClient() {
  return (
    <Suspense fallback={<DefaultLoading />}>
      <NewGrant />
    </Suspense>
  );
}
