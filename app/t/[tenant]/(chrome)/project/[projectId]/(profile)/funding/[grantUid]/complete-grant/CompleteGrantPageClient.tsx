"use client";

import dynamic from "next/dynamic";
import { DefaultLoading } from "@/components/Utilities/DefaultLoading";

const GrantCompletion = dynamic(
  () =>
    import(
      "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/CompleteGrant"
    ).then((mod) => mod.GrantCompletion),
  {
    loading: () => <DefaultLoading />,
  }
);

/**
 * Client-side grant completion form.
 */
export function CompleteGrantPageClient() {
  return <GrantCompletion />;
}
