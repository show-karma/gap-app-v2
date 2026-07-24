import { notFound } from "next/navigation";
import { ReportMilestonePage } from "@/components/Pages/Admin/ReportMilestonePage";
import { getCommunityPrograms } from "@/services/community-programs.service";
import type { CommunityProgram } from "@/types/v2/community-program";
import { defaultMetadata } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string }>;
}

// This page degrades to an empty program list on fetch failure (the service
// already logs via errorManager) — the report UI stays usable rather than
// hard-failing the whole admin route.
const getGrantPrograms = async (communityId: string): Promise<CommunityProgram[]> => {
  try {
    return await getCommunityPrograms(communityId);
  } catch {
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
