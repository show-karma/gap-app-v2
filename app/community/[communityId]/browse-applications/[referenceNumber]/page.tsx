"use client";

import { useParams } from "next/navigation";
import { ApplicationDetailsClient } from "./ApplicationDetailsClient";

export default function ApplicationDetailsPage() {
  const params = useParams<{ communityId: string; referenceNumber: string }>();
  return (
    <ApplicationDetailsClient
      communityId={params.communityId}
      referenceNumber={params.referenceNumber}
    />
  );
}
