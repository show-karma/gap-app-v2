import { defaultMetadata } from "@/utilities/meta";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { notFound } from "next/navigation";
import { zeroUID } from "@/utilities/commons";
import { ReportMilestonePage } from "@/components/Pages/Admin/ReportMilestonePage";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { errorManager } from "@/components/Utilities/errorManager";
import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";

export const metadata = defaultMetadata;

interface Props {
  params: { communityId: string };
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

export default async function Page({ params }: Props) {
  const communityId = params.communityId;

  const { data: community } = await gapIndexerApi
    .communityBySlug(communityId)
    .catch(() => {
      console.log("communityId", communityId);
      notFound();
    });
  if (!community || community?.uid === zeroUID) {
    console.log("communityId", communityId);
    notFound();
  }
  const grantPrograms = await getGrantPrograms(communityId);

  return (
    <ReportMilestonePage community={community} grantTitles={grantPrograms} />
  );
}
