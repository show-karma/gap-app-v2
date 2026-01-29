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
 * New Grant Page (V2)
 *
 * Displays the form to add a new grant/funding to the project.
 * Uses the profile layout context for consistent navigation.
 */
export default function NewGrantPage() {
  return (
    <Suspense fallback={<DefaultLoading />}>
      <NewGrant />
    </Suspense>
  );
}
