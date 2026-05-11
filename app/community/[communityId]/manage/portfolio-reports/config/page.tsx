import { notFound } from "next/navigation";
import { ReportConfigPage } from "@/components/Pages/Admin/PortfolioReports/ReportConfigPage";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { defaultMetadata } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string }>;
}

async function getGrantPrograms(communityId: string): Promise<GrantProgram[]> {
  const [result, error, _pageInfo, status] = await fetchData(
    INDEXER.COMMUNITY.PROGRAMS(communityId)
  );
  if (error) {
    errorManager(`Error fetching grant programs for community ${communityId}`, error);
    if (status === 504) {
      return [];
    }
    throw new Error(
      typeof error === "string" && error.length > 0
        ? error
        : `Failed to fetch grant programs for ${communityId}`
    );
  }
  return (result as GrantProgram[]) ?? [];
}

export default async function Page(props: Props) {
  const { communityId } = await props.params;
  const community = await getCommunityDetails(communityId);

  if (!community) {
    notFound();
  }

  const grantPrograms = await getGrantPrograms(communityId);

  return <ReportConfigPage community={community} grantPrograms={grantPrograms} />;
}
