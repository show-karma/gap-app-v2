/* eslint-disable @next/next/no-img-element */

import type { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { CommunityFeed } from "@/components/CommunityFeed";
import { CommunityGrants } from "@/components/CommunityGrants";
import type { MaturityStageOptions, SortByOptions } from "@/types";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import {
	getCommunityCategories,
	getCommunityData,
} from "@/utilities/queries/getCommunityData";

type Props = {
	params: Promise<{
		communityId: string;
	}>;
};

export default async function Page(props: Props) {
	const { communityId } = await props.params;

	if (pagesOnRoot.includes(communityId)) {
		return undefined;
	}

	const [community, categoriesOptions] = await Promise.all([
		getCommunityData(communityId),
		getCommunityCategories(communityId),
	]);

	const defaultSortBy = "milestones" as SortByOptions;
	const defaultSelectedCategories: string[] = [];
	const defaultSelectedMaturityStage = "all" as MaturityStageOptions;

	return (
		<div className="flex flex-row gap-6 w-full max-w-full sm:px-3 md:px-4 px-6 py-2">
			<div className="flex w-full max-w-full flex-col justify-start items-center gap-6">
				<div className="flex gap-8 flex-row max-lg:flex-col-reverse w-full">
					<CommunityGrants
						categoriesOptions={categoriesOptions}
						defaultSelectedCategories={defaultSelectedCategories}
						defaultSortBy={defaultSortBy}
						defaultSelectedMaturityStage={defaultSelectedMaturityStage}
						communityUid={(community as ICommunityResponse).uid}
					/>
				</div>
			</div>
			<div className="flex flex-col gap-2 w-4/12 max-lg:w-full max-lg:hidden">
				<CommunityFeed />
			</div>
		</div>
	);
}
