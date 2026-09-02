import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AskKarmaPage } from "@/src/features/ask-karma/components/ask-karma-page";
import { getAskKarmaConfig } from "@/src/features/ask-karma/config";
import { SITE_URL } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";

type Params = Promise<{
  communityId: string;
}>;

// Metadata is intentionally tenant-agnostic. The agent that answers these
// questions is Karma's regardless of which community surface the user is
// in, so the title/description shouldn't read "Ask Filecoin" etc. The
// in-page chrome still uses the community's branding.
const STATIC_TITLE = "Ask Karma";
const STATIC_DESCRIPTION =
  "Ask anything about funding rounds, project progress, milestones, and ecosystem insights.";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { communityId } = await params;
  // Still validate the community exists so an invalid slug 404s before
  // we surface metadata for it — the page below will notFound() too,
  // but Next.js calls generateMetadata first and we want the same
  // behaviour from both code paths.
  const community = await getCommunityDetails(communityId);
  if (!community || !community.details?.name) {
    notFound();
  }
  const canonical = PAGES.COMMUNITY.ASK_KARMA(communityId);

  return {
    title: STATIC_TITLE,
    description: STATIC_DESCRIPTION,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: `${SITE_URL}${canonical}`,
      title: STATIC_TITLE,
      description: STATIC_DESCRIPTION,
    },
  };
}

export default async function CommunityAskKarmaPage({ params }: { params: Params }) {
  const { communityId } = await params;
  const community = await getCommunityDetails(communityId);

  if (!community || !community.details?.name) {
    notFound();
  }

  const config = getAskKarmaConfig(communityId);

  return <AskKarmaPage config={config} communityId={communityId} />;
}
