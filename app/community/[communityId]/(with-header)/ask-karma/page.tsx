import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AskKarmaPage } from "@/src/features/ask-karma/components/ask-karma-page";
import { getAskKarmaConfig } from "@/src/features/ask-karma/config";
import { SITE_URL } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";

type Params = Promise<{
  communityId: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { communityId } = await params;
  const community = await getCommunityDetails(communityId);

  if (!community || !community.details?.name) {
    notFound();
  }

  const communityName = community.details.name;
  const title = `Ask ${communityName} — Karma Assistant`;
  const description = `Ask anything about ${communityName} — funding rounds, project progress, milestones, and ecosystem insights.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/community/${communityId}/ask-karma`,
    },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/community/${communityId}/ask-karma`,
      title,
      description,
    },
  };
}

export default async function CommunityAskKarmaPage({ params }: { params: Params }) {
  const { communityId } = await params;
  const community = await getCommunityDetails(communityId);

  if (!community || !community.details?.name) {
    notFound();
  }

  const config = getAskKarmaConfig(communityId, community.details.slug ?? communityId);

  return <AskKarmaPage config={config} communityId={communityId} />;
}
