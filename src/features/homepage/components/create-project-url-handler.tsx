"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const ProjectDialog = dynamic(
  () => import("@/components/Dialogs/ProjectDialog").then((mod) => mod.ProjectDialog),
  { ssr: false }
);

export function CreateProjectUrlHandler() {
  const searchParams = useSearchParams();
  const [shouldOpen, setShouldOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("action") === "create-project") {
      setShouldOpen(true);

      const url = new URL(window.location.href);
      url.searchParams.delete("action");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, [searchParams]);

  if (!shouldOpen) return null;

  return <ProjectDialog buttonElement={null} defaultOpen />;
}
