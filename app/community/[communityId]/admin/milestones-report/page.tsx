import { ReportMilestonePage } from "@/components/Pages/Admin/ReportMilestonePage";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { defaultMetadata } from "@/utilities/meta";
import { getCommunityDataV2 } from "@/utilities/queries/getCommunityData";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string }>;
}

const getGrantPrograms = async (communityId: string): Promise<GrantProgram[]> => {
  try {
    const [result, error] = await fetchData(INDEXER.COMMUNITY.PROGRAMS(communityId));
    if (error) {
      errorManager(`Error with fetching grant programs for community ${communityId}`, error);
    }
    return result as GrantProgram[];
  } catch (error: unknown) {
    errorManager(`Error while fetching grant programs of community ${communityId}`, error);
    return [];
  }
};

export default async function Page(props: Props) {
  const { communityId } = await props.params;

  const community = await getCommunityDataV2(communityId);
  const grantPrograms = await getGrantPrograms(communityId);

  return <ReportMilestonePage community={community} grantPrograms={grantPrograms} />;
}
