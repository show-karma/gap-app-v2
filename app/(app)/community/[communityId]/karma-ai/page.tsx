import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityProjectEvaluatorPage } from "@/components/Pages/Communities/CommunityProjectEvaluatorPage";
import { envVars } from "@/utilities/enviromentVars";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_URL, twitterMeta } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

type Params = Promise<{
  communityId: string;
}>;
type SearchParams = Promise<{
  programId: string;
}>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { communityId } = await params;
  const { programId } = await searchParams;
  let communityName = communityId;

  const community = await getCommunityDetails(communityId);

  if (!community || !community.details?.name) {
    notFound();
  }

  communityName = community.details.name;

  let dynamicMetadata = {
    title: `Karma AI - ${communityName} community grants`,
    description: `Chat with Karma AI assistant to projects in ${communityName}, measure their impact and fund them.`,
  };

  if (programId) {
    const [programsRes, _programsError] = await fetchData(INDEXER.COMMUNITY.PROGRAMS(communityId));
    const program = programsRes?.find((p: Record<string, unknown>) => p.programId === programId)
      ?.metadata?.title;
    if (program) {
      dynamicMetadata = {
        ...dynamicMetadata,
        description: `Chat with Karma AI assistant to projects in ${communityName}'s ${program}, measure their impact and fund them.`,
      };
    }
  }

  return {
    title: dynamicMetadata.title || DEFAULT_TITLE,
    description: dynamicMetadata.description || DEFAULT_DESCRIPTION,
    twitter: {
      creator: twitterMeta.creator,
      site: twitterMeta.site,
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/communities/${communityId}`,
          alt: dynamicMetadata.title || DEFAULT_TITLE,
        },
      ],
    },
    openGraph: {
      url: SITE_URL,
      title: dynamicMetadata.title || DEFAULT_TITLE,
      description: dynamicMetadata.description || DEFAULT_DESCRIPTION,
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/communities/${communityId}`,
          alt: dynamicMetadata.title || DEFAULT_TITLE,
        },
      ],
    },
  };
}

export default function ProjectsEvaluatorPage() {
  return (
    <div className="flex flex-col gap-5 h-full">
      <CommunityProjectEvaluatorPage />
    </div>
  );
}
