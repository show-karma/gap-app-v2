import { redirect } from "next/navigation";

export default function CommunityPayoutsPage({ params }: { params: { communityId: string } }) {
  redirect(`/community/${params.communityId}/manage/control-center`);
}
