"use client";
import { useParams, useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { useEffect, useRef } from "react";
import { useCommunityProjects } from "@/hooks/useCommunityProjects";
import { SearchWithValueDropdown } from "./SearchWithValueDropdown";

interface ProjectFilterProps {
  defaultProjectSelected?: string;
  defaultProgramSelected?: string;
}

export const ProjectFilter = ({
  defaultProjectSelected,
  defaultProgramSelected,
}: ProjectFilterProps) => {
  const { communityId } = useParams();
  const searchParams = useSearchParams();
  const programSelected = searchParams.get("programId");

  const [selectedProjectId, changeSelectedProjectIdQuery] = useQueryState<string | null>(
    "projectId",
    {
      defaultValue: defaultProjectSelected || null,
      serialize: (value) => value ?? "",
      parse: (value) => value || null,
    }
  );

  // Filter projects by selected program
  const { data: projects, isLoading } = useCommunityProjects(programSelected);

  // Track previous program to detect actual changes (not initial load)
  const previousProgramRef = useRef<string | null>(null);

  // Reset project selection when program actually changes (not on initial load)
  useEffect(() => {
    // On first render, store the current program and don't reset
    if (previousProgramRef.current === null) {
      previousProgramRef.current = programSelected;
      return;
    }

    // Only reset if program actually changed from a previous value
    if (programSelected !== previousProgramRef.current) {
      changeSelectedProjectIdQuery(null);
      previousProgramRef.current = programSelected;
    }
  }, [programSelected, changeSelectedProjectIdQuery]);

  const projectOptions =
    projects?.map((project) => ({
      title: project.title,
      value: project.uid,
    })) || [];

  const selectedProject = projectOptions.find((project) => project.value === selectedProjectId);

  return (
    <div className="flex flex-col gap-1.5 flex-1 min-w-[220px] max-w-[450px]">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        Project
      </span>

      <SearchWithValueDropdown
        list={projectOptions}
        onSelectFunction={(value: string) => changeSelectedProjectIdQuery(value)}
        type={"Projects"}
        selected={selectedProject ? [selectedProject.title as string] : []}
        prefixUnselected="All"
        buttonClassname="w-full max-w-full"
        isMultiple={false}
        cleanFunction={() => changeSelectedProjectIdQuery(null)}
      />
    </div>
  );
};
