import type { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useQuery } from "@tanstack/react-query";
import { zeroUID } from "@/utilities/commons";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";

const fetchCommunityDetails = async (communityId: string) => {
	if (!communityId) throw new Error("Community ID is required");

	const { data: result } = await gapIndexerApi.communityBySlug(communityId);
	if (!result || result.uid === zeroUID) {
		throw new Error("Community not found");
	}

	return result;
};

export const useCommunityDetails = (communityId: string) => {
	return useQuery<ICommunityResponse, Error>({
		queryKey: ["community", communityId],
		queryFn: () => fetchCommunityDetails(communityId),
		enabled: !!communityId,
		retry: false,
	});
};
