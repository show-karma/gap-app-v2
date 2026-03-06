import type { Metadata } from "next";
import { ApplicationEditClient } from "./ApplicationEditClient";

interface PageProps {
  params: Promise<{ communityId: string; applicationId: string }>;
}

export const metadata: Metadata = {
  title: "Edit Application",
  robots: { index: false },
};

export default async function ApplicationEditPage({ params }: PageProps) {
  const { communityId, applicationId } = await params;

  return <ApplicationEditClient communityId={communityId} applicationId={applicationId} />;
}
