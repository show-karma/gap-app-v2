import { defaultMetadata } from "@/utilities/meta";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { notFound } from "next/navigation";
import { zeroUID } from "@/utilities/commons";
import { ReportMilestonePage } from "@/components/Pages/Admin/ReportMilestonePage";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import * as Sentry from "@sentry/nextjs";

export const metadata = defaultMetadata;

interface Props {
  params: { communityId: string };
}

const getGrantTitles = async (communityId: string): Promise<string[]> => {
  try {
    const [data] = await fetchData(INDEXER.COMMUNITY.GRANT_TITLES(communityId));
    if (!data) {
      throw new Error(
        `No data found on grant titles of community ${communityId}`
      );
    }
    return data;
  } catch (error) {
    Sentry.captureException(error);
    console.log(error);
    return [];
  }
};

export default async function Page({ params }: Props) {
  const communityId = params.communityId;
  const { data: community } = await gapIndexerApi
    .communityBySlug(communityId)
    .catch(() => {
      notFound();
    });
  if (!community || community?.uid === zeroUID) {
    notFound();
  }
  const grantTitles = await getGrantTitles(communityId);

  return (
    <ReportMilestonePage community={community} grantTitles={grantTitles} />
  );
}
