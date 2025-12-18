"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";

interface CreateProjectButtonProps {
  styleClass?: string;
}

const defaultStyleClass =
  "px-4 py-2.5 text-sm font-medium w-max bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow";

export function CreateProjectButton({ styleClass = defaultStyleClass }: CreateProjectButtonProps) {
  const ProjectDialog = useMemo(
    () =>
      dynamic(
        () => import("@/components/Dialogs/ProjectDialog/index").then((mod) => mod.ProjectDialog),
        {
          ssr: false,
          loading: () => <Button className={styleClass}>Create project</Button>,
        }
      ),
    [styleClass]
  );

  return (
    <ProjectDialog
      buttonElement={{
        text: "Create project",
        styleClass,
      }}
    />
  );
}
