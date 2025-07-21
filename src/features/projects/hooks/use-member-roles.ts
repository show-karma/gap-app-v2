import { useProjectStore } from "@/features/projects/lib/store";
import {
  getProjectMemberRoles,
  Member,
} from "@/features/projects/lib/getProjectMemberRoles";
import { useQuery } from "@tanstack/react-query";
import { defaultQueryOptions } from "@/lib/queries/defaultOptions";
import useProjectInstance from "@/features/projects/hooks/use-project-instance";

export const useMemberRoles = () => {
  const project = useProjectStore((state) => state.project);
  const { project: projectInstance } = useProjectInstance(
    project?.details?.data.slug || project?.uid || ""
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
