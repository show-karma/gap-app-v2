import type { Metadata } from "next";
import { ApplicationPageClient } from "./ApplicationPageClient";

interface PageProps {
  params: Promise<{ communityId: string; applicationId: string }>;
}

export const metadata: Metadata = {
  title: "Application Details",
  robots: { index: false },
};

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { communityId, applicationId } = await params;

  return <ApplicationPageClient communityId={communityId} applicationId={applicationId} />;
}
