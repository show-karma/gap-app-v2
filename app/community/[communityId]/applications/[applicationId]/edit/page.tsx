"use client";

import { useParams } from "next/navigation";
import { ApplicationEditClient } from "./ApplicationEditClient";

export default function ApplicationEditPage() {
  const params = useParams<{ communityId: string; applicationId: string }>();
  return (
    <ApplicationEditClient
      communityId={params.communityId}
      applicationId={params.applicationId}
    />
  );
}
