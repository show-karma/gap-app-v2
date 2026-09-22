import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { NotebooksUnavailable } from "@/components/Pages/Communities/Notebooks/NotebooksUnavailable";
import { NotebookViewer } from "@/components/Pages/Communities/Notebooks/NotebookViewer";
import { getPublishedNotebook, type NotebookConfig } from "@/services/notebooks.service";
import { NOTEBOOKS_ENABLED_COMMUNITIES } from "@/utilities/community-flags";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";

type Params = Promise<{ communityId: string; slug: string }>;

const getCachedCommunity = cache(getCommunityDetails);

/**
 * A draft page and an unknown slug both answer 404 from the API, by design —
 * so both land here as `null` and render the same not-found. Nothing in this
 * route may distinguish them, or a slug probe would enumerate drafts.
 */
const getCachedNotebook = cache(
  async (communityId: string, slug: string): Promise<NotebookConfig | null> => {
    try {
      return await getPublishedNotebook(communityId, slug);
    } catch {
      return null;
    }
  }
);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { communityId, slug } = await params;

  if (!NOTEBOOKS_ENABLED_COMMUNITIES.includes(communityId)) {
    return {};
  }

  const notebook = await getCachedNotebook(communityId, slug);
  if (!notebook) {
    return {};
  }

  const community = await getCachedCommunity(communityId);
  const communityName = community?.details?.name || communityId;

  return {
    title: `${notebook.name} - ${communityName}`,
    description: notebook.description ?? `Interactive data notebook published by ${communityName}.`,
  };
}

export default async function NotebookPage({ params }: { params: Params }) {
  const { communityId, slug } = await params;

  if (!NOTEBOOKS_ENABLED_COMMUNITIES.includes(communityId)) {
    const community = await getCachedCommunity(communityId);
    return (
      <NotebooksUnavailable
        communityId={communityId}
        communityName={community?.details?.name || communityId}
      />
    );
  }

  const notebook = await getCachedNotebook(communityId, slug);
  if (!notebook) {
    notFound();
  }

  return <NotebookViewer communityId={communityId} notebook={notebook} />;
}
