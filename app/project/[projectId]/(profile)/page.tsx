"use client";

import dynamic from "next/dynamic";
import { UpdatesContent as DirectUpdatesContent } from "@/components/Pages/Project/v2/Content/UpdatesContent";
import { UpdatesContentSkeleton } from "@/components/Pages/Project/v2/Skeletons";

const DynamicUpdatesContent = dynamic(
  () =>
    import("@/components/Pages/Project/v2/Content/UpdatesContent").then(
      (mod) => mod.UpdatesContent
    ),
  {
    loading: () => <UpdatesContentSkeleton />,
  }
);

const UpdatesContent =
  process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true" ? DirectUpdatesContent : DynamicUpdatesContent;

/**
 * Updates page - the main/default tab for the project profile.
 * Shows the activity feed with milestones and updates.
 */
export default function UpdatesPage() {
  return <UpdatesContent />;
}
