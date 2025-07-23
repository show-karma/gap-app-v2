import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export const programService = {
	// Get all programs for a community
	getCommunityPrograms: async (
		communityId: string,
	): Promise<GrantProgram[]> => {
		try {
			const [data, error] = await fetchData(
				INDEXER.PROGRAMS.COMMUNITY(communityId),
			);

			if (error) {
				throw new Error(error);
			}

			return data as GrantProgram[];
		} catch (error: any) {
			errorManager(
				`Error fetching programs for community ${communityId}`,
				error,
			);
			throw error;
		}
	},

	// Get a specific program by ID
	getProgram: async (programId: string): Promise<GrantProgram> => {
		try {
			const [data, error] = await fetchData(INDEXER.PROGRAMS.GET(programId));

			if (error) {
				throw new Error(error);
			}

			return data as GrantProgram;
		} catch (error: any) {
			errorManager(`Error fetching program ${programId}`, error);
			throw error;
		}
	},
};
