"use client";

import dynamic from "next/dynamic";
import { useShareDialogStore } from "@/store/modals/shareDialog";

const ShareDialog = dynamic(
  () =>
    import("../GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/ShareDialog").then(
      (mod) => mod.ShareDialog
    ),
  { ssr: false }
);

/**
 * Mounts the global share dialog for all project routes.
 * Without this mount, openShareDialog updates state but no UI can render it.
 */
export const ProjectShareDialogMount = () => {
  const { isOpen } = useShareDialogStore();

  if (!isOpen) return null;
  return <ShareDialog />;
};
