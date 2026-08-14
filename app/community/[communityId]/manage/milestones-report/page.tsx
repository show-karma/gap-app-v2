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

export default async function Page(props: Props) {
  const { communityId } = await props.params;

  const community = await getCommunityDetails(communityId);

  if (!community) {
    notFound();
  }

  // Fetch failures bubble to the manage segment's error.tsx (the service
  // already logs via errorManager) — a silent empty list would misreport
  // "no programs" to admins.
  const grantPrograms: CommunityProgram[] = await getCommunityPrograms(communityId);

  return <ReportMilestonePage community={community} grantPrograms={grantPrograms} />;
}
