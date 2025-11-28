"use client";
import Image from "next/image";
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
    <div className="flex flex-row gap-4 items-center flex-1 max-w-[450px]">
      <Image
        src={"/icons/project.png"}
        alt="Project"
        width={24}
        height={24}
        className="w-6 h-6 min-w-6 max-w-6 min-h-6 max-h-6"
      />
      <p className="text-gray-800 dark:text-zinc-100 text-base font-semibold leading-normal">
        Project
      </p>

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
