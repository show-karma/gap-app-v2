import { useQuery } from "@tanstack/react-query";
import { useProjectStore } from "@/store";
import {
	getProjectMemberRoles,
	type Member,
} from "@/utilities/getProjectMemberRoles";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { useProjectInstance } from "./useProjectInstance";

export const useMemberRoles = () => {
	const project = useProjectStore((state) => state.project);
	const { project: projectInstance } = useProjectInstance(
		project?.details?.data.slug || project?.uid || "",
	);

	return useQuery<Record<string, Member["role"]>>({
		queryKey: ["memberRoles", project?.uid],
		queryFn: () =>
			project && projectInstance
				? getProjectMemberRoles(project, projectInstance)
				: {},
		enabled: !!project && !!projectInstance,
		...defaultQueryOptions,
	});
};
