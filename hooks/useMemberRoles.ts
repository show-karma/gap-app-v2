import { useQuery } from "@tanstack/react-query";
import { useProjectStore } from "@/store";
import { getProjectMemberRoles, type Member } from "@/utilities/getProjectMemberRoles";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";

export const useMemberRoles = () => {
  const project = useProjectStore((state) => state.project);

  return useQuery<Record<string, Member["role"]>>({
    queryKey: ["memberRoles", project?.uid],
    queryFn: () => (project ? getProjectMemberRoles(project) : {}),
    enabled: !!project,
    ...defaultQueryOptions,
  });
};
