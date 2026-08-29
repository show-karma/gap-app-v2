import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { NotebooksUnavailable } from "@/components/Pages/Communities/Notebooks/NotebooksUnavailable";
import { NotebookViewer } from "@/components/Pages/Communities/Notebooks/NotebookViewer";
import { getNotebookOverview } from "@/services/notebook-overview.service";
import { getPublishedNotebook, type NotebookConfig } from "@/services/notebooks.service";
import { HttpError } from "@/utilities/api/errors";
import { NOTEBOOKS_ENABLED_COMMUNITIES } from "@/utilities/community-flags";
import { notebookDemoConfig } from "@/utilities/notebooks-demo-stub";
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
 *
 * ONLY a 404 means that. Every other failure — the config service being down,
 * a 500, a timeout, a schema mismatch — is rethrown so the error boundary
 * handles it. Swallowing those into `null` told a reader "this page does not
 * exist" when the truth was "we could not load its configuration": a different
 * cause, a different owner, and it sent people looking at community data
 * instead of at the config service.
 */
const getCachedNotebook = cache(
  async (communityId: string, slug: string): Promise<NotebookConfig | null> => {
    try {
      return await getPublishedNotebook(communityId, slug);
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
  }
);

/**
 * Real config first; the preview-only demo stub only ever fills a 404.
 * TEMPORARY — see utilities/notebooks-demo-stub.ts. Delete with it.
 */
async function resolveNotebook(communityId: string, slug: string): Promise<NotebookConfig | null> {
  return (await getCachedNotebook(communityId, slug)) ?? notebookDemoConfig(communityId, slug);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { communityId, slug } = await params;

  if (!NOTEBOOKS_ENABLED_COMMUNITIES.includes(communityId)) {
    return {};
  }

  const notebook = await resolveNotebook(communityId, slug);
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

  const notebook = await resolveNotebook(communityId, slug);
  if (!notebook) {
    notFound();
  }

  // Served from the tagged data cache, so the request path costs a cache read
  // rather than an upstream round trip. A refresh that fails keeps the last
  // good payload rather than blanking a page that was working (FR5).
  const overview = await getNotebookOverview(communityId);

  return <NotebookViewer communityId={communityId} notebook={notebook} overview={overview} />;
}
