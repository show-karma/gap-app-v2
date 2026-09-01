"use client";

import { useParams } from "next/navigation";
import { BrowseApplicationsClient } from "./BrowseApplicationsClient";

export default function BrowseApplicationsPage() {
  const params = useParams<{ communityId: string }>();
  const communityId = params.communityId;

  return (
    <div className="flex flex-col pb-20">
      <BrowseApplicationsClient communityId={communityId} />
    </div>
  );
}
