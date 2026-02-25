"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";

interface CreateProjectButtonProps {
  styleClass?: string;
}

const defaultStyleClass = "px-4 py-[7.5px] text-sm font-medium w-max";

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
