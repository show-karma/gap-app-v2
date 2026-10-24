import { notFound } from "next/navigation";
import { PanelListPage } from "@/components/Pages/Admin/Panels/PanelListPage";
import { defaultMetadata } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

export const metadata = {
  ...defaultMetadata,
  title: "Panels",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ communityId: string }>;
}

export default async function Page(props: Props) {
  const { communityId } = await props.params;
  const community = await getCommunityDetails(communityId);

  if (!community) {
    notFound();
  }

  return <PanelListPage community={community} />;
}
