import { defaultMetadata } from "@/lib/metadata/meta";
import { gapIndexerApi } from "@/services/gap-indexer/gap-indexer";
import { notFound } from "next/navigation";
import { zeroUID } from "@/lib/utils/misc";
import fetchData from "@/lib/utils/fetch-data";
import { INDEXER } from "@/services/indexer";
import { GrantProgram } from "@/features/program-registry/types";
import { getCommunityData } from "@/lib/queries/getCommunityData";
import errorManager from "@/lib/utils/error-manager";
import { ReportMilestonePage } from "@/features/admin/components/community-admin/ReportMilestonePage";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string }>;
}

const getGrantPrograms = async (communityId: string): Promise<string[]> => {
  try {
    const [result, error] = await fetchData(
      INDEXER.COMMUNITY.PROGRAMS(communityId)
    );
    if (error) {
      console.log(
        "Error with fetching grant programs for community",
        communityId,
        error
      );
    }
    const programTitles = result.map(
      (program: GrantProgram) => program.metadata?.title
    );
    return programTitles;
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
    <ReportMilestonePage community={community} grantTitles={grantPrograms} />
  );
}
