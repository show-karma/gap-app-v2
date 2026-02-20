import { redirect } from "next/navigation";
import { PAGES } from "@/utilities/pages";

export default async function CommunityPayoutsPage(props: {
  params: Promise<{ communityId: string }>;
}) {
  const { communityId } = await props.params;
  redirect(PAGES.ADMIN.CONTROL_CENTER(communityId));
}
