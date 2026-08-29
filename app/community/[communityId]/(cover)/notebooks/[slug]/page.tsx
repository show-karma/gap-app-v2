import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { NotebooksUnavailable } from "@/components/Pages/Communities/Notebooks/NotebooksUnavailable";
import { NotebookViewer } from "@/components/Pages/Communities/Notebooks/NotebookViewer";
import { getNotebookOverview } from "@/services/notebook-overview.service";
import { getPublishedNotebook, type NotebookConfig } from "@/services/notebooks.service";
import { NOTEBOOKS_ENABLED_COMMUNITIES } from "@/utilities/community-flags";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";

type Params = Promise<{ communityId: string; slug: string }>;

/**
 * Declares the freshness window this page is built around.
 *
 * Currently inert: the root layout awaits `headers()` for whitelabel
 * detection, which makes every route in this app render dynamically, so Next
 * never treats this page as statically regenerable. The window that actually
 * applies is on the DATA — see `notebook-overview.service.ts`, where the
 * payload is held in a tagged cache for the same interval and invalidated
 * on demand by `/api/notebooks/revalidate`.
 *
 * It is declared anyway because it states the intended contract in the place a
 * reader looks for it, and becomes the real mechanism the moment the layout's
 * unconditional `headers()` read is lifted.
 */
// Must be a literal: Next parses segment config statically and rejects an
// imported constant ("Invalid segment configuration export"). Kept in step
// with NOTEBOOK_REVALIDATE_SECONDS by a test rather than by an import.
export const revalidate = 3600;

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

  // Served from the tagged data cache, so the request path costs a cache read
  // rather than an upstream round trip. A refresh that fails keeps the last
  // good payload rather than blanking a page that was working (FR5).
  const overview = await getNotebookOverview(communityId);

  return <NotebookViewer communityId={communityId} notebook={notebook} overview={overview} />;
}
