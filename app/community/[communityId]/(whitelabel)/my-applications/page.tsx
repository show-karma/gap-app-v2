"use client";

import { useParams } from "next/navigation";
import { MyApplicationsClient } from "./MyApplicationsClient";

export default function MyApplicationsPage() {
  const params = useParams<{ communityId: string }>();
  return <MyApplicationsClient communityId={params.communityId} />;
}
