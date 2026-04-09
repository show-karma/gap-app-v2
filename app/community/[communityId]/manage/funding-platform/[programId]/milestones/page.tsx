import { redirect } from "next/navigation";
import { PAGES } from "@/utilities/pages";

export default async function MilestonesIndexPage({
  params,
}: {
  params: Promise<{ communityId: string }>;
}) {
  const { communityId } = await params;
  redirect(PAGES.ADMIN.MILESTONES(communityId));
}
