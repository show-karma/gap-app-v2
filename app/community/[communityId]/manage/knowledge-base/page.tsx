import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { KnowledgeBasePage } from "@/components/Pages/Admin/KnowledgeBasePage/KnowledgeBasePage";
import { Spinner } from "@/components/Utilities/Spinner";
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

  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <KnowledgeBasePage community={community} />
    </Suspense>
  );
}
