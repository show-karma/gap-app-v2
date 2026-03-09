"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const ProjectDialog = dynamic(
  () => import("@/components/Dialogs/ProjectDialog").then((mod) => mod.ProjectDialog),
  { ssr: false }
);

export function CreateProjectUrlHandler() {
  const searchParams = useSearchParams();

  if (searchParams.get("action") !== "create-project") return null;

  return <ProjectDialog buttonElement={null} defaultOpen />;
}
