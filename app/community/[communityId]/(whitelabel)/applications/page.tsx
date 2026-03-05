import { permanentRedirect } from "next/navigation";

type Props = {
  params: Promise<{ communityId: string }>;
};

// Stable URL consolidation: /applications → /my-applications (308)
export default async function UserApplicationsPage({ params }: Props) {
  const { communityId } = await params;
  permanentRedirect(`/community/${communityId}/my-applications`);
}
