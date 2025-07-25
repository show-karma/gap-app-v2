import { useProjectStore } from "@/store";
import {
  getProjectMemberRoles,
  Member,
} from "@/utilities/getProjectMemberRoles";
import { useQuery } from "@tanstack/react-query";
import { useProjectInstance } from "./useProjectInstance";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";

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
