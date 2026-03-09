"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

const ProjectDialog = dynamic(
  () => import("@/components/Dialogs/ProjectDialog").then((mod) => mod.ProjectDialog),
  { ssr: false }
);

function clearActionParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete("action");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}

export function CreateProjectUrlHandler() {
  const searchParams = useSearchParams();
  const handleClose = useCallback(clearActionParam, []);

  if (searchParams.get("action") !== "create-project") return null;

  return <ProjectDialog buttonElement={null} defaultOpen onClose={handleClose} />;
}
