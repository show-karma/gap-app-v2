"use client";
import { useImpactMeasurement } from "@/hooks/useImpactMeasurement";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
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

  const [selectedProjectId, changeSelectedProjectIdQuery] = useQueryState<
    string | null
  >("projectId", {
    defaultValue: defaultProjectSelected || null,
    serialize: (value) => value ?? "",
    parse: (value) => value || null,
  });

  const { data, isLoading } = useImpactMeasurement();

  const projects = data
    ?.map((program) => program.outputs.map((output) => output))
    .flat()
    .map((project) => ({
      title: project.projectTitle,
      value: project.projectUID,
    }));
  const uniqueProjects: {
    title: string;
    value: string;
  }[] = [];
  projects?.forEach((project) => {
    if (!uniqueProjects.some((p) => p.title === project.title)) {
      uniqueProjects.push({
        title: project.title,
        value: project.value,
      });
    }
  });

  const selectedProject = uniqueProjects?.find(
    (project) => project.value === selectedProjectId
  );

  return (
    <div className="flex flex-row gap-4 items-center flex-1">
      <Image src={"/icons/project.png"} alt="Project" width={24} height={24} />
      <p className="text-gray-800 dark:text-zinc-100 text-base font-semibold leading-normal">
        Project
      </p>

      <SearchWithValueDropdown
        list={uniqueProjects || []}
        onSelectFunction={(value: string) =>
          changeSelectedProjectIdQuery(value)
        }
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
