import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccessDeniedMessagesPage } from "@/components/Pages/Admin/AccessDeniedMessagesPage";
import { customMetadata } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

export const metadata: Metadata = customMetadata({
  title: "Access Denied Page",
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

  return <AccessDeniedMessagesPage community={community} />;
}
