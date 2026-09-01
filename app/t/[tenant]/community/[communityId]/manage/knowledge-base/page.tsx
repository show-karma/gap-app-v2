import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KnowledgeBasePage } from "@/components/Pages/Admin/KnowledgeBasePage/KnowledgeBasePage";
import { customMetadata } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

export const metadata: Metadata = customMetadata({
  title: "Knowledge Base",
});

interface Props {
  params: Promise<{ communityId: string }>;
}

export default async function Page(props: Props) {
  const { communityId } = await props.params;
  const community = await getCommunityDetails(communityId);

  if (!community) {
    notFound();
  }

  // No <Suspense> wrapper — KnowledgeBasePage is a client component using
  // React Query and never suspends. Sibling `loading.tsx` already provides the
  // App Router loading boundary while this server component awaits data.
  return <KnowledgeBasePage community={community} />;
}
