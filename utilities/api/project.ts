import type { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { envVars } from "../enviromentVars";

export const getProjectData = async (
	projectId: string,
	fetchOptions: RequestInit,
): Promise<IProjectResponse | undefined> => {
	const project = await fetch(
		`${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/projects/${projectId}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
			...fetchOptions,
		},
	);
	if (!project.ok) {
		throw new Error(`HTTP error! status: ${project.status}`);
	}

	const data = await project.json();
	return data;
};
