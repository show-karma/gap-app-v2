"use client";

import dynamic from "next/dynamic";

const ProjectDialog = dynamic(
  () =>
    import("@/components/Dialogs/ProjectDialog/index").then(
      (mod) => mod.ProjectDialog
    ),
  { ssr: false }
);

export function CreateProjectButton() {
  return (
    <ProjectDialog
      buttonElement={{
        text: "Create project",
        styleClass: "px-6 py-2.5 text-sm font-medium w-max bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow",
      }}
    />
  );
}

