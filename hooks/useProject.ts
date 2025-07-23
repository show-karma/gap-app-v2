import type { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useProjectStore } from "@/store";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";

export const useProject = (projectId: string) => {
	const setProject = useProjectStore((state) => state.setProject);

	const query = useQuery({
		queryKey: ["project", projectId],
		queryFn: async (): Promise<IProjectResponse> => {
			const response = await gapIndexerApi.projectBySlug(projectId);
			return response.data;
		},
		enabled: !!projectId,
		...defaultQueryOptions,
	});

	useEffect(() => {
		if (query.data) {
			setProject(query.data);
		}
	}, [query.data, setProject]);

	return {
		project: query.data,
		isLoading: query.isLoading,
		error: query.error,
		refetch: query.refetch,
		isError: query.isError,
		isFetching: query.isFetching,
	};
};
