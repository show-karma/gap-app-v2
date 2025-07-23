import type { Hex } from "viem";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { errorManager } from "@/components/Utilities/errorManager";
import { getPrograms } from "@/utilities/sdk/communities/getPrograms";

export const programService = {
	/**
	 * Fetch programs for a community and sort them by creation date (newest first)
	 * @param communityId The community ID to fetch programs for
	 * @returns A sorted array of GrantPrograms
	 */
	getCommunityPrograms: async (communityId: Hex): Promise<GrantProgram[]> => {
		try {
			const programs = await getPrograms(communityId);

			// Sort programs by creation date (newest first)
			return programs.sort((a, b) => {
				const aTime = new Date(a.createdAt).getTime();
				const bTime = new Date(b.createdAt).getTime();
				return bTime - aTime;
			});
		} catch (error: any) {
			errorManager(
				`Error fetching programs for community ${communityId}`,
				error,
			);
			throw error;
		}
	},
};
