"use client";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { useImpactMeasurement } from "@/hooks/useImpactMeasurement";
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

	const impacts = data?.data;

	const projects = impacts
		?.flatMap((impact) => impact.impacts)
		.flatMap((item) => item.indicators)
		.map((item) => ({
			title: item.projectTitle || item.projectSlug || item.projectUID,
			value: item.projectUID,
		}));
	const uniqueProjects: {
		title: string;
		value: string;
	}[] = [];
	projects?.forEach((project) => {
		if (!uniqueProjects.some((p) => p.value === project.value)) {
			uniqueProjects.push({
				title: project.title,
				value: project.value,
			});
		}
	});

	const selectedProject = uniqueProjects?.find(
		(project) => project.value === selectedProjectId,
	);

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
