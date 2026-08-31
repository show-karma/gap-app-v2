import { notFound } from "next/navigation";
import { NotebookBuilderEditorPage } from "@/components/Pages/Admin/Notebooks/NotebookBuilderEditorPage";
import { getNotebookOverview } from "@/services/notebook-overview.service";
import { getNotebookIndicatorCatalog } from "@/services/notebooks/notebook-indicators.query";
import { NOTEBOOKS_ENABLED_COMMUNITIES } from "@/utilities/community-flags";
import { defaultMetadata } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string }>;
}

export default async function Page(props: Props) {
  const { communityId } = await props.params;

  if (!NOTEBOOKS_ENABLED_COMMUNITIES.includes(communityId)) {
    notFound();
  }

  const community = await getCommunityDetails(communityId);
  if (!community) {
    notFound();
  }

  // Fetched server-side, from the same cached payload the public page reads,
  // so the preview shows the community's real figures rather than placeholders.
  // The catalog is what makes "pull different data without code" real: the
  // author picks an indicator from it rather than pasting an id.
  const [overview, catalog] = await Promise.all([
    getNotebookOverview(communityId),
    getNotebookIndicatorCatalog().catch(() => null),
  ]);

  return (
    <NotebookBuilderEditorPage
      community={community}
      overview={overview}
      indicators={catalog?.indicators}
    />
  );
}
