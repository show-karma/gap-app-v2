import { notFound } from "next/navigation";
import { NotebookBuilderEditorPage } from "@/components/Pages/Admin/Notebooks/NotebookBuilderEditorPage";
import { getNotebookOverview } from "@/services/notebook-overview.service";
import { getNotebookIndicatorCatalog } from "@/services/notebooks/notebook-indicators.query";
import { NOTEBOOKS_ENABLED_COMMUNITIES } from "@/utilities/community-flags";
import { defaultMetadata } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string; slug: string }>;
}

export default async function Page(props: Props) {
  const { communityId, slug } = await props.params;

  if (!NOTEBOOKS_ENABLED_COMMUNITIES.includes(communityId)) {
    notFound();
  }

  const community = await getCommunityDetails(communityId);
  if (!community) {
    notFound();
  }

  // The config itself is loaded client-side through the AUTHENTICATED admin
  // endpoint: it may be a draft, and a draft must never be fetched on a path
  // that has no session to authorize it.
  const [overview, catalog] = await Promise.all([
    getNotebookOverview(communityId),
    getNotebookIndicatorCatalog().catch(() => null),
  ]);

  return (
    <NotebookBuilderEditorPage
      community={community}
      slug={slug}
      overview={overview}
      indicators={catalog?.indicators}
    />
  );
}
