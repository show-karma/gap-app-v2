"use client";

import dynamic from "next/dynamic";
import { UpdatesContentSkeleton } from "@/components/Pages/Project/v2/Skeletons";

const UpdatesContent = dynamic(
  () =>
    import("@/components/Pages/Project/v2/Content/UpdatesContent").then(
      (mod) => mod.UpdatesContent
    ),
  {
    loading: () => <UpdatesContentSkeleton />,
  }
);

/**
 * Updates page - the main/default tab for the project profile.
 * Shows the activity feed with milestones and updates.
 */
export default function UpdatesPage() {
  return <UpdatesContent />;
}
