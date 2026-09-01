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
 * Client-side updates content for the main project profile tab.
 */
export function UpdatesPageClient() {
  return <UpdatesContent />;
}
