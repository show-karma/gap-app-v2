import { defaultMetadata } from "@/utilities/meta";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { notFound } from "next/navigation";
import { zeroUID } from "@/utilities/commons";
import { ReportMilestonePage } from "@/components/Pages/Admin/ReportMilestonePage";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { errorManager } from "@/components/Utilities/errorManager";
import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { getCommunityData } from "@/utilities/queries/getCommunityData";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string }>;
}

const getGrantPrograms = async (
  communityId: string
): Promise<GrantProgram[]> => {
  try {
    const [result, error] = await fetchData(
      INDEXER.COMMUNITY.PROGRAMS(communityId)
    );
    if (error) {
      errorManager(
        `Error with fetching grant programs for community ${communityId}`,
        error
      );
    }
    return result as GrantProgram[];
  } catch (error: any) {
    errorManager(
      `Error while fetching grant programs of community ${communityId}`,
      error
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
    <ReportMilestonePage community={community} grantPrograms={grantPrograms} />
  );
}
