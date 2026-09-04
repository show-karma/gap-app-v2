import { notFound } from "next/navigation";
import { NotebookBuilderListPage } from "@/components/Pages/Admin/Notebooks/NotebookBuilderListPage";
import { NOTEBOOKS_ENABLED_COMMUNITIES } from "@/utilities/community-flags";
import { defaultMetadata } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string }>;
}

export default async function Page(props: Props) {
  const { communityId } = await props.params;

  // The builder is gated on the same flag as the public routes. Without this a
  // community with notebooks disabled could compose and publish pages that
  // resolve nowhere — the public route would render "not available" for the
  // page they had just been told was live.
  if (!NOTEBOOKS_ENABLED_COMMUNITIES.includes(communityId)) {
    notFound();
  }

  const community = await getCommunityDetails(communityId);
  if (!community) {
    notFound();
  }

  return <NotebookBuilderListPage community={community} />;
}
