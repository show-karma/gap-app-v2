import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotificationSettingsPage } from "@/components/Pages/Admin/NotificationSettingsPage";
import { customMetadata } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

export const metadata: Metadata = customMetadata({
  title: "Notification Settings",
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

  // No <Suspense> wrapper: NotificationSettingsPage is a client component that
  // owns its own loading state via useCommunityConfig, so a Suspense boundary
  // here would never trigger. Loading is handled by the route-level
  // loading.tsx (covers data-fetch above) and by the inner spinner.
  return <NotificationSettingsPage community={community} />;
}
