import { notFound } from "next/navigation";
import { ReportMilestonePage } from "@/components/Pages/Admin/ReportMilestonePage";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { errorManager } from "@/components/Utilities/errorManager";
import { zeroUID } from "@/utilities/commons";
import fetchData from "@/utilities/fetchData";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { INDEXER } from "@/utilities/indexer";
import { defaultMetadata } from "@/utilities/meta";
import { getCommunityData } from "@/utilities/queries/getCommunityData";

export const metadata = defaultMetadata;

interface Props {
	params: Promise<{ communityId: string }>;
}

const getGrantPrograms = async (communityId: string): Promise<string[]> => {
	try {
		const [result, error] = await fetchData(
			INDEXER.COMMUNITY.PROGRAMS(communityId),
		);
		if (error) {
			console.log(
				"Error with fetching grant programs for community",
				communityId,
				error,
			);
		}
		const programTitles = result.map(
			(program: GrantProgram) => program.metadata?.title,
		);
		return programTitles;
	} catch (error: any) {
		errorManager(
			`Error while fetching grant programs of community ${communityId}`,
			error,
		);
		return [];
	}
};

export default async function Page(props: Props) {
	const { communityId } = await props.params;

	const community = await getCommunityData(communityId);
	if (!community || community?.uid === zeroUID) {
		notFound();
	}
	const grantPrograms = await getGrantPrograms(communityId);

	return (
		<ReportMilestonePage community={community} grantTitles={grantPrograms} />
	);
}
