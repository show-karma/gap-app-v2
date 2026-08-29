import type { Metadata } from "next";
import { cache } from "react";
import { NotebookList } from "@/components/Pages/Communities/Notebooks/NotebookList";
import { NotebooksUnavailable } from "@/components/Pages/Communities/Notebooks/NotebooksUnavailable";
import { getPublishedNotebooks } from "@/services/notebooks.service";
import { NOTEBOOKS_ENABLED_COMMUNITIES } from "@/utilities/community-flags";
import { COMMUNITY_NAV_LABELS } from "@/utilities/community-nav";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";

type Params = Promise<{ communityId: string }>;

const getCachedCommunity = cache(getCommunityDetails);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { communityId } = await params;

  if (!NOTEBOOKS_ENABLED_COMMUNITIES.includes(communityId)) {
    return {};
  }

  const community = await getCachedCommunity(communityId);
  const communityName = community?.details?.name || communityId;

  // No self-canonical: this route is absent from the sitemap and consolidates
  // onto the community root canonical it inherits from the layout. Give it a
  // canonical and a sitemap entry together, once the pages render server-side.
  return {
    title: `${COMMUNITY_NAV_LABELS.notebooks} - ${communityName}`,
    description: `Interactive data notebooks published by ${communityName}.`,
  };
}

export default async function NotebooksPage({ params }: { params: Params }) {
  const { communityId } = await params;

  // Same shape as the financials route: a community that exists but has not
  // enabled notebooks gets an explicit "not available" state with a way back,
  // rather than a silent redirect (looks broken) or a "community not found"
  // (misleading — the community exists).
  if (!NOTEBOOKS_ENABLED_COMMUNITIES.includes(communityId)) {
    const community = await getCachedCommunity(communityId);
    return (
      <NotebooksUnavailable
        communityId={communityId}
        communityName={community?.details?.name || communityId}
      />
    );
  }

  // Fetched on the server so the list is in the initial HTML. A failure throws
  // to error.tsx, which offers a retry — the three states are list / empty /
  // error, and none of them is a bare null.
  const notebooks = await getPublishedNotebooks(communityId);

  return <NotebookList communityId={communityId} notebooks={notebooks} />;
}
