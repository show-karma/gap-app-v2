import { permanentRedirect } from "next/navigation";

type Props = {
  params: Promise<{ communityId: string; referenceNumber: string }>;
};

// Stable URL consolidation: /browse-applications/:ref → /applications/:ref (308)
export default async function ApplicationDetailsPage({ params }: Props) {
  const { communityId, referenceNumber } = await params;
  permanentRedirect(`/community/${communityId}/applications/${referenceNumber}`);
}
