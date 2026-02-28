"use client";

import { useParams } from "next/navigation";
import { ApplicationPageClient } from "./ApplicationPageClient";

export default function ApplicationDetailPage() {
  const params = useParams<{ communityId: string; applicationId: string }>();
  return (
    <ApplicationPageClient
      communityId={params.communityId}
      applicationId={params.applicationId}
    />
  );
}
