import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReportConfigPage } from "@/components/Pages/Admin/PortfolioReports/ReportConfigPage";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { errorManager } from "@/components/Utilities/errorManager";
import { Spinner } from "@/components/Utilities/Spinner";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import { defaultMetadata } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string }>;
}

async function getGrantPrograms(communityId: string): Promise<GrantProgram[]> {
  // We deliberately let errors bubble up to Next.js — silently returning []
  // makes a fetch outage indistinguishable from "this community has no
  // programs", which lets admins save configs with no programIds. The
  // route's error.tsx surfaces a retry CTA.
  try {
    // TODO(#1775): add zod schema
    const result = await api.get<GrantProgram[]>(INDEXER.COMMUNITY.PROGRAMS(communityId));
    return result ?? [];
  } catch (error) {
    errorManager(`Error fetching grant programs for community ${communityId}`, error);
    throw error;
  }
}

export default async function Page(props: Props) {
  const { communityId } = await props.params;
  const community = await getCommunityDetails(communityId);

  if (!community) {
    notFound();
  }

  const grantPrograms = await getGrantPrograms(communityId);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <Spinner />
        </div>
      }
    >
      <ReportConfigPage community={community} grantPrograms={grantPrograms} />
    </Suspense>
  );
}
