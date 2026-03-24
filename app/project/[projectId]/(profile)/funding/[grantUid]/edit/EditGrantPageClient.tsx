"use client";

import dynamic from "next/dynamic";
import { DefaultLoading } from "@/components/Utilities/DefaultLoading";
import { useGrantStore } from "@/store/grant";

const NewGrant = dynamic(
  () =>
    import("@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrant").then(
      (mod) => mod.NewGrant
    ),
  {
    loading: () => <DefaultLoading />,
  }
);

/**
 * Client-side edit grant form.
 */
export function EditGrantPageClient() {
  const { grant } = useGrantStore();
  return <NewGrant grantToEdit={grant} />;
}
