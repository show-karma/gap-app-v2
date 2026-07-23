import { notFound } from "next/navigation";
import { ReportMilestonePage } from "@/components/Pages/Admin/ReportMilestonePage";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import { defaultMetadata } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string }>;
}

const getGrantPrograms = async (communityId: string): Promise<GrantProgram[]> => {
  try {
    // TODO(#1775): add zod schema
    return await api.get<GrantProgram[]>(INDEXER.V2.COMMUNITIES.PROGRAMS(communityId));
  } catch (error: unknown) {
    errorManager(`Error while fetching grant programs of community ${communityId}`, error);
    return [];
  }
};

export default async function Page(props: Props) {
  const { communityId } = await props.params;

  const community = await getCommunityDetails(communityId);

  if (!community) {
    notFound();
  }

  const grantPrograms = await getGrantPrograms(communityId);

  return <ReportMilestonePage community={community} grantPrograms={grantPrograms} />;
}
