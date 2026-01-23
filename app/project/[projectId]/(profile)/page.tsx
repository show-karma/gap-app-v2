"use client";

import dynamic from "next/dynamic";

const UpdatesContent = dynamic(
  () =>
    import("@/components/Pages/Project/v2/Content/UpdatesContent").then(
      (mod) => mod.UpdatesContent
    ),
  {
    loading: () => <div className="animate-pulse text-gray-500">Loading updates...</div>,
  }
);

/**
 * Updates page - the main/default tab for the project profile.
 * Shows the activity feed with milestones and updates.
 */
export default function UpdatesPage() {
  return <UpdatesContent />;
}
